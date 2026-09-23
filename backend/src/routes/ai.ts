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
}).refine((value) => value.message.length > 0 || Boolean(value.imageName), {
  message: "Tell the assistant what you need or attach an image",
});

const STOP_WORDS = new Set([
  "a", "an", "and", "any", "are", "below", "buy", "for", "find", "get", "i", "image", "in",
  "is", "looking", "me", "my", "need", "of", "or", "photo", "picture", "please", "product", "show",
  "some", "the", "to", "under", "want", "with",
]);

const SYNONYMS: Record<string, string[]> = {
  phone: ["smartphone", "mobile", "android"],
  sneaker: ["sneakers", "shoe", "shoes", "footwear"],
  sneakers: ["sneaker", "shoe", "shoes", "footwear"],
  laptop: ["computer", "notebook", "programming"],
  dress: ["fashion", "clothing", "gown"],
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

  router.post("/ai/search", asyncRoute(async (req, res) => {
    const input = requestSchema.parse(req.body);
    const source = `${input.message} ${input.imageName ?? ""}`.toLowerCase();
    const requestedTerms = tokenize(source);
    const terms = [...expandTerms(requestedTerms)];
    const strictTerms = requestedTerms.filter((term) => STRICT_PRODUCT_TERMS.has(term));
    const budget = readMaximumBudget(source);
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

    const matches = ranked.slice(0, 12).map(({ product, store }) => ({
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
    const response = matches.length === 0
      ? strictTerms.length > 0
        ? `I could not find an in-stock ${strictTerms.join(" ")} matching your request. I will not substitute a different brand or model.`
        : "I could not find an in-stock product matching that request. Try a broader name or create a buyer request."
      : `I found ${matches.length} live marketplace ${matches.length === 1 ? "product" : "products"}${budget !== undefined ? `, including ${exactCount} within ${formatNaira(budget)}` : ""}.`;

    ok(res, {
      response,
      products: matches,
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
      .sort((a, b) => +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)));
    ok(res, requests);
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
