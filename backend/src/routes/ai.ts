import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";

const requestSchema = z.object({
  message: z.string().trim().max(1000).default(""),
  imageName: z.string().trim().max(255).optional(),
  imageType: z.string().trim().max(100).optional(),
  sessionId: z.string().trim().max(100).optional(),
}).refine((value) => value.message.length > 0 || Boolean(value.imageName), {
  message: "Tell the assistant what you need or attach an image",
});

const STOP_WORDS = new Set([
  "a", "about", "an", "and", "any", "are", "available", "below", "buy", "can", "carry", "could",
  "did", "do", "does", "for", "find", "get", "has", "have", "i", "image", "in", "is", "kind",
  "kinds", "looking", "me", "my", "need", "of", "or", "photo", "picture", "please", "product",
  "products", "sell", "show", "some", "stock", "tell", "the", "there", "to", "type", "types",
  "under", "want", "what", "which", "with", "would", "you", "your",
]);

const SYNONYMS: Record<string, string[]> = {
  phone: ["smartphone", "mobile", "android"],
  sneaker: ["sneakers", "shoe", "shoes", "footwear"],
  sneakers: ["sneaker", "shoe", "shoes", "footwear"],
  laptop: ["computer", "notebook", "programming"],
  dress: ["fashion", "clothing", "gown"],
  clothe: ["clothes", "clothing", "dress", "shirt", "t-shirt", "gown", "fashion", "wear"],
  clothing: ["clothes", "dress", "shirt", "t-shirt", "gown", "fashion", "wear"],
  watch: ["wristwatch", "wrist", "timepiece"],
  hair: ["hair", "wig", "extension", "scarf", "hair cream"],
  makeup: ["makeup", "cosmetic", "cosmetics", "beauty", "foundation", "lipstick", "powder", "face cream"],
  cosmetic: ["cosmetics", "makeup", "beauty", "foundation", "lipstick", "powder", "face cream"],
  bag: ["bag", "handbag", "crossbody", "purse"],
  ps5: ["playstation", "console", "gaming"],
};

const STRICT_PRODUCT_TERMS = new Set(["apple", "iphone", "nike", "playstation", "ps5", "samsung", "galaxy"]);

const buyerRequestSchema = z.object({
  product: z.string().trim().min(2).max(160),
  details: z.string().trim().max(1000).default(""),
  condition: z.string().trim().min(2).max(80),
  maximumBudget: z.number().positive().max(1_000_000_000),
  deliveryLocation: z.string().trim().min(2).max(200),
  neededBy: z.string().trim().min(2).max(80),
});

export const aiRoutes = (db: Database) => {
  const router = Router();
  router.use("/ai", authenticate, authorize("customer", "admin"));

  router.post("/ai/search", asyncRoute(async (req: AuthRequest, res) => {
    const input = requestSchema.parse(req.body);
    const source = `${input.message} ${input.imageName ?? ""}`.toLowerCase();
    const attributeQuestion = isAttributeQuestion(source);
    const recentHistory = attributeQuestion
      ? (await db.list<Entity>("aiHistory"))
        .filter((item) => item.customerId === req.user!.id && (!input.sessionId || item.sessionId === input.sessionId))
        .sort((a, b) => +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)))
      : [];
    const previousQuery = String(recentHistory[0]?.query ?? "");
    const searchSource = attributeQuestion && previousQuery ? previousQuery.toLowerCase() : source;
    const requestedTerms = tokenize(searchSource);
    const terms = [...expandTerms(requestedTerms)];
    const strictTerms = requestedTerms.filter((term) => STRICT_PRODUCT_TERMS.has(term));
    const budget = readMaximumBudget(searchSource);
    const [products, stores, categories] = await Promise.all([
      db.list<Entity>("products"),
      db.list<Entity>("stores"),
      db.list<Entity>("categories"),
    ]);
    const storeById = new Map(stores.map((store) => [store.id, store]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    const ranked = products
      .filter((product) => product.status === "active" && Number(product.stock) > 0)
      .map((product) => {
        const store = storeById.get(String(product.storeId));
        const category = categoryById.get(String(product.categoryId));
        const text = [
          product.name,
          product.description,
          category?.name,
          ...(product.tags as string[] | undefined ?? []),
          JSON.stringify(product.variantOptions ?? []),
          JSON.stringify(product.variants ?? []),
          JSON.stringify(product.specifications ?? []),
        ]
          .join(" ").toLowerCase();
        const directMatches = terms.filter((term) => text.includes(term)).length;
        const nameMatches = terms.filter((term) => String(product.name).toLowerCase().includes(term)).length;
        const price = Number(product.price);
        const budgetFit = budget === undefined ? 0 : price <= budget ? 4 : Math.max(-4, -((price - budget) / budget) * 8);
        const score = directMatches * 3 + nameMatches * 4 + budgetFit + Number(product.rating ?? 0) / 5;
        const strictMatch = strictTerms.every((term) => text.includes(term));
        const detailMatch = requestedTerms.every((term) =>
          [term, ...(SYNONYMS[term] ?? [])].some((candidate) => text.includes(candidate)),
        );
        return { product, store, score, strictMatch, detailMatch };
      })
      .filter((item) => (terms.length === 0 || item.score > 0) && item.strictMatch && item.detailMatch)
      .sort((a, b) => b.score - a.score || Number(a.product.price) - Number(b.product.price));

    const shoppingIntent = isShoppingRequest(source, input.imageName) || ranked.length > 0 || attributeQuestion;
    let selected = shoppingIntent ? ranked.slice(0, 12) : [];
    let response = answerMarketplaceQuestion(source, products, stores);
    if (attributeQuestion && previousQuery) {
      response = answerAttributeQuestion(source, selected.map(({ product }) => product));
    } else if (/\b(have|has|sell|stock|available|carry)\b/i.test(source) && selected.length > 0) {
      response = answerAvailabilityQuestion(selected.map(({ product }) => product));
    }
    const aiAnswer = !response ? await generateMarketplaceReply({
      customerId: req.user!.id,
      sessionId: input.sessionId,
      message: input.message,
      products,
      stores,
      db,
    }) : null;
    if (aiAnswer) {
      response = aiAnswer.response;
      if (aiAnswer.productIds.length > 0) {
        const selectedIds = new Set(aiAnswer.productIds);
        selected = ranked.filter(({ product }) => selectedIds.has(String(product.id)));
        for (const product of products) {
          if (!selectedIds.has(String(product.id)) || selected.some((item) => item.product.id === product.id)) continue;
          selected.push({ product, store: storeById.get(String(product.storeId)), score: 0, strictMatch: true, detailMatch: true });
        }
        selected = selected.slice(0, 12);
      }
    }
    const matches = selected.map(({ product, store }) => ({
      ...product,
      store: store ? {
        id: store.id,
        name: store.name,
        slug: store.slug,
        verified: Boolean(store.verified),
        rating: Number(store.rating ?? 0),
        location: store.location,
      } : null,
    }));
    const exactCount = budget === undefined ? matches.length : matches.filter((product) => Number((product as Entity).price) <= budget).length;
    if (!response) {
      response = matches.length === 0
        ? strictTerms.length > 0
          ? `I could not find an in-stock ${strictTerms.join(" ")} matching your request. I will not substitute a different brand or model.`
          : shoppingIntent
            ? "I could not find an in-stock product matching that request. Try a broader name or create a buyer request."
            : "I can chat about the marketplace, check what a store sells, compare prices, or help you find a product. What would you like to know?"
        : `I found ${matches.length} live marketplace ${matches.length === 1 ? "product" : "products"}${budget !== undefined ? `, including ${exactCount} within ${formatNaira(budget)}` : ""}.`;
    }

    await db.create("aiHistory", {
      id: id("ai-history"),
      customerId: req.user!.id,
      sessionId: input.sessionId,
      query: input.message || `Image search: ${input.imageName}`,
      response,
      productIds: matches.map((product) => product.id),
      resultCount: matches.length,
      createdAt: now(),
    });

    ok(res, {
      response,
      products: matches,
      intent: shoppingIntent || matches.length > 0 ? "shopping" : "chat",
      filters: { terms, strictTerms, ...(budget !== undefined ? { maximumPrice: budget } : {}) },
      imageSearch: input.imageName ? { received: true, fileName: input.imageName, mediaType: input.imageType } : null,
    });
  }));

  router.post("/ai/transcribe", asyncRoute(async (req, res) => {
    const input = z.object({
      audio: z.string().min(1).max(10_000_000),
      mediaType: z.string().regex(/^audio\//).max(100),
    }).parse(req.body);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new ApiError(503, "Voice transcription is not configured");
    const encoded = input.audio.replace(/^data:audio\/[^;]+;base64,/, "");
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length === 0 || bytes.length > 7_000_000) throw new ApiError(400, "Audio recording is empty or too large");
    const extension = input.mediaType.includes("ogg") ? "ogg" : input.mediaType.includes("mp4") ? "mp4" : "webm";
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: input.mediaType }), `voice.${extension}`);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", "en");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const payload = await response.json() as { text?: string; error?: { message?: string } };
    if (!response.ok) throw new ApiError(502, payload.error?.message ?? "Voice transcription failed");
    const text = payload.text?.trim();
    if (!text) throw new ApiError(422, "No speech was detected in the recording");
    ok(res, { text });
  }));

  router.get("/ai/requests", asyncRoute(async (req: AuthRequest, res) => {
    const requests = (await db.list<Entity>("buyerRequests"))
      .filter((request) => req.user!.role === "admin" || request.customerId === req.user!.id)
      .sort((a, b) => +new Date(String((b as Entity).createdAt)) - +new Date(String((a as Entity).createdAt)));
    ok(res, requests);
  }));

  router.get("/ai/history", asyncRoute(async (req: AuthRequest, res) => {
    const history = (await db.list<Entity>("aiHistory"))
      .filter((item) => req.user!.role === "admin" || item.customerId === req.user!.id)
      .sort((a, b) => +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)));
    ok(res, history);
  }));

  router.get("/ai/offers", asyncRoute(async (req: AuthRequest, res) => {
    const conversations = (await db.list<Entity>("conversations"))
      .filter((conversation) => req.user!.role === "admin" || conversation.customerId === req.user!.id);
    const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
    const [stores, products] = await Promise.all([db.list<Entity>("stores"), db.list<Entity>("products")]);
    const storeById = new Map(stores.map((store) => [store.id, store]));
    const productById = new Map(products.map((product) => [product.id, product]));
    const offers = (await db.list<Entity>("offers"))
      .filter((offer) => offer.by === "vendor" && conversationById.has(String(offer.conversationId)))
      .map((offer) => {
        const conversation = conversationById.get(String(offer.conversationId))!;
        const store = storeById.get(String(conversation.storeId));
        const product = productById.get(String(offer.productId));
        return {
          ...offer,
          productName: conversation.productName,
          productImage: conversation.productImage,
          productSlug: product?.slug,
          store: store ? { id: store.id, name: store.name, verified: Boolean(store.verified), rating: Number(store.rating ?? 0) } : null,
        };
      })
      .sort((a, b) => +new Date(String((b as Entity).createdAt)) - +new Date(String((a as Entity).createdAt)));
    ok(res, offers);
  }));

  router.post("/ai/requests", asyncRoute(async (req: AuthRequest, res) => {
    const input = buyerRequestSchema.parse(req.body);
    created(res, await db.create("buyerRequests", {
      id: id("buyer-request"),
      customerId: req.user!.id,
      ...input,
      status: "active",
      offerCount: 0,
      createdAt: now(),
      updatedAt: now(),
    }));
  }));
  return router;
};

function isShoppingRequest(message: string, imageName?: string) {
  return Boolean(imageName) || /\b(find|show|buy|need|want|looking for|search|under|budget|available|stock|have|compare|difference|price)\b/i.test(message);
}

function isAttributeQuestion(message: string) {
  return /\b(what|which|show|list|available|have|has|do)\b.*\b(colou?rs?|sizes?|variants?|options?)\b|^\s*(colou?rs?|sizes?|variants?|options?)\s*[?.!]*\s*$/i.test(message);
}

function answerAvailabilityQuestion(products: Entity[]) {
  const prices = products.map((product) => Number(product.price)).filter(Number.isFinite).sort((a, b) => a - b);
  const names = products.slice(0, 4).map((product) => String(product.name)).join(", ");
  const priceRange = prices.length === 0 ? "" : prices[0] === prices.at(-1)
    ? ` at ${formatNaira(prices[0])}`
    : ` from ${formatNaira(prices[0])} to ${formatNaira(prices.at(-1)!)}`;
  return `Yes. I found ${products.length} matching in-stock ${products.length === 1 ? "product" : "products"}${priceRange}: ${names}. I’ve shown ${products.length === 1 ? "it" : "them"} below.`;
}

function answerAttributeQuestion(message: string, products: Entity[]) {
  if (products.length === 0) return "I could not find a previous matching product to check. Tell me the product name first.";
  const attribute = /\bcolou?r/i.test(message) ? "colour" : /\bsize/i.test(message) ? "size" : "option";
  const values = new Set<string>();
  for (const product of products) {
    const details = [product.variantOptions, product.variants, product.specifications];
    for (const detail of details) collectAttributeValues(detail, attribute, values);
  }
  if (values.size > 0) {
    return `The listed ${attribute} ${values.size === 1 ? "option is" : "options are"}: ${[...values].slice(0, 12).join(", ")}.`;
  }
  return `I found ${products.length} matching ${products.length === 1 ? "product" : "products"}, but the sellers have not listed ${attribute} options yet. Open a product or message the seller to confirm the available ${attribute}s.`;
}

function collectAttributeValues(value: unknown, attribute: string, output: Set<string>) {
  if (!value || output.size >= 12) return;
  if (Array.isArray(value)) {
    for (const item of value) collectAttributeValues(item, attribute, output);
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key.toLowerCase().includes(attribute === "colour" ? "color" : attribute) ||
      (attribute === "colour" && key.toLowerCase().includes("colour"))) {
      const items = Array.isArray(item) ? item : [item];
      for (const entry of items) {
        if (typeof entry === "string" || typeof entry === "number") output.add(String(entry));
      }
    } else {
      collectAttributeValues(item, attribute, output);
    }
  }
}

function answerMarketplaceQuestion(message: string, products: Entity[], stores: Entity[]) {
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|how are you)[!.?\s]*$/i.test(message.trim())) {
    return "Hello! I’m your Vendura shopping assistant. I can find products, check a seller’s stock, count store products, and compare prices. What can I help you with?";
  }
  if (/\b(thank you|thanks|thank u)\b/i.test(message)) {
    return "You’re welcome. Ask me anything else about products or stores on Vendura.";
  }

  const normalizedMessage = normalizeForMatch(message);
  const store = stores
    .filter((candidate) => normalizedMessage.includes(normalizeForMatch(String(candidate.name))))
    .sort((a, b) => String(b.name).length - String(a.name).length)[0];
  const activeProducts = products.filter((product) => product.status === "active");
  if (store) {
    const storeProducts = activeProducts.filter((product) => product.storeId === store.id);
    const inStock = storeProducts.filter((product) => Number(product.stock) > 0);
    if (/\b(how many|number of|count)\b/i.test(message)) {
      return `${store.name} has ${storeProducts.length} active ${storeProducts.length === 1 ? "product" : "products"} on Vendura, and ${inStock.length} ${inStock.length === 1 ? "is" : "are"} currently in stock.`;
    }
    const storeWords = new Set(tokenize(String(store.name)));
    const queryTerms = tokenize(message).filter((term) => !storeWords.has(term));
    const matching = inStock.filter((product) => {
      const text = normalizeForMatch(`${product.name} ${product.description} ${(product.tags as string[] | undefined ?? []).join(" ")}`);
      return queryTerms.some((term) => text.includes(term));
    });
    if (/\b(have|has|sell|stock|available|carry)\b/i.test(message) && queryTerms.length > 0) {
      return matching.length > 0
        ? `${store.name} has ${matching.length} matching in-stock ${matching.length === 1 ? "product" : "products"}: ${matching.slice(0, 4).map((product) => `${product.name} (${formatNaira(Number(product.price))})`).join(", ")}.`
        : `I could not find that product in ${store.name}’s current in-stock listings.`;
    }
    if (/\b(tell me about|about|store|shop)\b/i.test(message)) {
      return `${store.name} has ${storeProducts.length} active products, a ${Number(store.rating ?? 0).toFixed(1)} rating, and is ${store.verified ? "verified" : "not yet verified"} on Vendura.`;
    }
  }
  if (/\b(how many|number of|count)\b.*\bproducts?\b/i.test(message)) {
    const inStock = activeProducts.filter((product) => Number(product.stock) > 0).length;
    return `Vendura currently has ${activeProducts.length} active products from ${stores.length} stores, with ${inStock} products in stock.`;
  }
  if (/\b(how many|number of|count)\b.*\bstores?\b/i.test(message)) {
    return `Vendura currently has ${stores.length} ${stores.length === 1 ? "store" : "stores"}, including ${stores.filter((item) => item.verified).length} verified sellers.`;
  }
  return "";
}

async function generateMarketplaceReply({ customerId, sessionId, message, products, stores, db }: {
  customerId: string;
  sessionId?: string;
  message: string;
  products: Entity[];
  stores: Entity[];
  db: Database;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !message.trim() || process.env.NODE_ENV === "test") return null;
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const catalog = products
    .filter((product) => product.status === "active")
    .slice(0, 200)
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      stock: Number(product.stock),
      store: storeById.get(String(product.storeId))?.name ?? "Unknown store",
      tags: product.tags ?? [],
    }));
  const history = (await db.list<Entity>("aiHistory"))
    .filter((item) => item.customerId === customerId && (!sessionId || item.sessionId === sessionId))
    .sort((a, b) => +new Date(String(a.createdAt)) - +new Date(String(b.createdAt)))
    .slice(-6)
    .map((item) => ({ user: item.query, assistant: item.response }));
  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        instructions: "You are Vendura's friendly customer shopping assistant. Answer conversationally and use only the supplied live catalog for factual product, price, stock, and store claims. Never invent products. Select product IDs only when cards would help answer the user. Keep answers concise and helpful.",
        input: JSON.stringify({ conversation: history, customerMessage: message, liveCatalog: catalog }),
        text: {
          format: {
            type: "json_schema",
            name: "vendura_marketplace_reply",
            strict: true,
            schema: {
              type: "object",
              properties: {
                response: { type: "string" },
                productIds: { type: "array", items: { type: "string" } },
              },
              required: ["response", "productIds"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!aiResponse.ok) return null;
    const payload = await aiResponse.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) return null;
    const parsed = z.object({ response: z.string().min(1), productIds: z.array(z.string()).max(12) }).parse(JSON.parse(text));
    const validIds = new Set(catalog.map((product) => String(product.id)));
    return { response: parsed.response, productIds: parsed.productIds.filter((productId) => validIds.has(productId)) };
  } catch {
    return null;
  }
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return value
    .replace(/[₦$,.]/g, " ")
    .split(/[^a-z0-9]+/)
    .map((term) => normalizeTerm(term.trim()))
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term) && !/^\d+$/.test(term));
}

function normalizeTerm(term: string) {
  if (term.endsWith("ies") && term.length > 4) return `${term.slice(0, -3)}y`;
  if (term.endsWith("sses")) return term.slice(0, -2);
  if (/(ches|shes|xes|zes)$/.test(term) && term.length > 4) return term.slice(0, -2);
  if (term.endsWith("s") && !term.endsWith("ss") && term.length > 3) return term.slice(0, -1);
  return term;
}

function expandTerms(terms: string[]) {
  return new Set(terms.flatMap((term) => [term, ...(SYNONYMS[term] ?? [])]));
}

function readMaximumBudget(value: string) {
  const matches = [...value.matchAll(/(?:₦|ngn\s*)?([\d,.]+)\s*(k|m|million|thousand)?/gi)];
  const candidate = matches.find((match) => /budget|under|below|max|maximum|less/.test(value.slice(Math.max(0, (match.index ?? 0) - 30), (match.index ?? 0) + match[0].length + 10))) ?? matches.at(-1);
  if (!candidate) return undefined;
  let amount = Number(candidate[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const suffix = candidate[2]?.toLowerCase();
  if (suffix === "k" || suffix === "thousand") amount *= 1_000;
  if (suffix === "m" || suffix === "million") amount *= 1_000_000;
  return amount >= 1_000 ? amount : undefined;
}

function formatNaira(value: number) {
  return `₦${Math.round(value).toLocaleString("en-NG")}`;
}
