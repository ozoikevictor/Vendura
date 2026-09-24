import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok, slugify } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { productSchema } from "../schemas.js";
import type { AuthRequest, Database, Entity } from "../types.js";
import { getSubscriptionPlan } from "../lib/subscriptions.js";

export const catalogRoutes = (db: Database) => {
  const router = Router();
  router.get("/categories", asyncRoute(async (req, res) => {
    const [categoryItems, products] = await Promise.all([
      db.list<Entity>("categories"),
      db.list<Entity>("products")
    ]);
    let items = categoryItems;
    const activeProducts = products.filter(isLiveProduct);
    const productCounts = new Map<string, number>();
    for (const product of activeProducts) {
      const categoryId = String(product.categoryId ?? "");
      productCounts.set(categoryId, (productCounts.get(categoryId) ?? 0) + 1);
    }
    items = items.map((category) => ({ ...category, productCount: productCounts.get(category.id) ?? 0 }));
    if (req.query.popular === "true") items = items.sort((a, b) => Number(b.productCount) - Number(a.productCount)).slice(0, Number(req.query.limit ?? 8));
    res.set("Cache-Control", "no-cache, must-revalidate");
    ok(res, items);
  }));
  router.get("/categories/:slug", asyncRoute(async (req, res) => {
    const item = await db.findOne("categories", { slug: req.params.slug });
    if (!item) throw new ApiError(404, "Category not found");
    ok(res, item);
  }));
  router.get("/categories/:categorySlug/subcategories/:subcategorySlug", asyncRoute(async (req, res) => {
    const category = await db.findOne<Entity>("categories", { slug: req.params.categorySlug });
    const item = (category?.subcategories as Entity[] | undefined)?.find((value) => value.slug === req.params.subcategorySlug);
    if (!item) throw new ApiError(404, "Subcategory not found");
    ok(res, item);
  }));
  router.get("/stores", asyncRoute(async (req, res) => {
    const [stores, products] = await Promise.all([
      db.list<Entity>("stores"),
      db.list<Entity>("products"),
    ]);
    const activeCounts = countActiveProductsByStore(products);
    let items: Entity[] = stores.map((store) => ({ ...store, productCount: activeCounts.get(store.id) ?? 0 }));
    if (req.query.featured === "true") items = items.filter((item) => item.verified).slice(0, Number(req.query.limit ?? 6));
    res.set("Cache-Control", "no-cache, must-revalidate");
    ok(res, items);
  }));
  router.get("/stores/slug/:slug", asyncRoute(async (req, res) => {
    const item = await db.findOne("stores", { slug: req.params.slug });
    if (!item) throw new ApiError(404, "Store not found");
    const products = (await db.list<Entity>("products")).filter((product) => product.storeId === item.id && isLiveProduct(product));
    ok(res, { ...item, productCount: products.length });
  }));
  router.get("/stores/:id", asyncRoute(async (req, res) => {
    const item = await db.get("stores", String(req.params.id));
    if (!item) throw new ApiError(404, "Store not found");
    const products = (await db.list<Entity>("products")).filter((product) => product.storeId === item.id && isLiveProduct(product));
    ok(res, { ...item, productCount: products.length });
  }));
  router.get("/storefronts/:slug", asyncRoute(async (req, res) => {
    const store = await db.findOne<Entity>("stores", { slug: req.params.slug });
    if (!store) throw new ApiError(404, "Storefront not found");
    const products = (await db.list<Entity>("products"))
      .filter((product) => product.storeId === store.id && isLiveProduct(product));
    ok(res, { store: { ...store, productCount: products.length }, products });
  }));
  router.get("/products", asyncRoute(async (req, res) => {
    const query = z.object({ q: z.string().optional(), categorySlug: z.string().optional(), subcategorySlug: z.string().optional(), storeId: z.string().optional(), minPrice: z.coerce.number().optional(), maxPrice: z.coerce.number().optional(), negotiableOnly: z.enum(["true", "false"]).optional(), inStockOnly: z.enum(["true", "false"]).optional(), sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "rating", "popular"]).default("relevance"), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24) }).parse(req.query);
    let items = (await db.list<Entity>("products")).filter(isLiveProduct);
    const categories = query.categorySlug || query.subcategorySlug
      ? await db.list<Entity>("categories")
      : [];
    if (query.q) { const q = query.q.toLowerCase(); items = items.filter((p) => String(p.name).toLowerCase().includes(q) || String(p.description).toLowerCase().includes(q) || (p.tags as string[]).some((tag) => tag.toLowerCase().includes(q))); }
    if (query.categorySlug) { const category = categories.find((c) => c.slug === query.categorySlug); items = items.filter((p) => p.categoryId === category?.id); }
    if (query.subcategorySlug) { const subIds = categories.flatMap((c) => c.subcategories as Entity[]).filter((s) => s.slug === query.subcategorySlug).map((s) => s.id); items = items.filter((p) => subIds.includes(String(p.subcategoryId))); }
    if (query.storeId) items = items.filter((p) => p.storeId === query.storeId);
    if (query.minPrice !== undefined) items = items.filter((p) => Number(p.price) >= query.minPrice!);
    if (query.maxPrice !== undefined) items = items.filter((p) => Number(p.price) <= query.maxPrice!);
    if (query.negotiableOnly === "true") items = items.filter((p) => p.negotiable);
    if (query.inStockOnly === "true") items = items.filter((p) => Number(p.stock) > 0);
    const sorts = { relevance: (a: Entity, b: Entity) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(b.soldCount) - Number(a.soldCount), newest: (a: Entity, b: Entity) => +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)), price_asc: (a: Entity, b: Entity) => Number(a.price) - Number(b.price), price_desc: (a: Entity, b: Entity) => Number(b.price) - Number(a.price), rating: (a: Entity, b: Entity) => Number(b.rating) - Number(a.rating), popular: (a: Entity, b: Entity) => Number(b.soldCount) - Number(a.soldCount) };
    items.sort(sorts[query.sort]);
    if (query.sort === "relevance" && !query.storeId) items = mixProductsByStore(items);
    const total = items.length;
    items = items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    res.set("Cache-Control", "no-cache, must-revalidate");
    ok(res, { items, total, page: query.page, pageSize: query.pageSize });
  }));
  router.get("/products/featured", asyncRoute(async (req, res) => ok(res, (await db.list<Entity>("products")).filter((product) => product.featured && isLiveProduct(product)).slice(0, Number(req.query.limit ?? 8)))));
  router.get("/products/slug/:slug", asyncRoute(async (req, res) => { const item = await db.findOne("products", { slug: req.params.slug }); if (!item) throw new ApiError(404, "Product not found"); ok(res, item); }));
  router.get("/products/:id", asyncRoute(async (req, res) => { const item = await db.get("products", String(req.params.id)); if (!item) throw new ApiError(404, "Product not found"); ok(res, item); }));
  router.get("/products/:id/related", asyncRoute(async (req, res) => { const item = await db.get<Entity>("products", String(req.params.id)); if (!item) throw new ApiError(404, "Product not found"); const all = await db.list<Entity>("products"); ok(res, all.filter((product) => product.id !== item.id && product.categoryId === item.categoryId && isLiveProduct(product)).slice(0, Number(req.query.limit ?? 4))); }));
  router.get("/products/:id/reviews", asyncRoute(async (req, res) => {
    const product = await db.get<Entity>("products", String(req.params.id));
    if (!product) throw new ApiError(404, "Product not found");
    const reviews = (product.reviews as Entity[] | undefined) ?? [];
    ok(res, reviews.sort((a, b) => +new Date(String(b.createdAt)) - +new Date(String(a.createdAt))));
  }));
  router.post("/products/:id/reviews", authenticate, authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const input = z.object({ orderId: z.string().min(1), rating: z.number().int().min(1).max(5), comment: z.string().trim().min(5).max(1000) }).parse(req.body);
    const product = await db.get<Entity>("products", String(req.params.id));
    if (!product) throw new ApiError(404, "Product not found");
    const order = await db.get<Entity>("orders", input.orderId);
    if (!order || (req.user!.role !== "admin" && order.customerId !== req.user!.id)) throw new ApiError(404, "Delivered order not found");
    if (order.status !== "delivered") throw new ApiError(409, "You can review this product after the order is delivered");
    const items = order.items as Entity[];
    if (!items.some((item) => item.productId === product.id)) throw new ApiError(400, "This product is not part of that order");
    const reviews = (product.reviews as Entity[] | undefined) ?? [];
    if (reviews.some((review) => review.orderId === order.id && review.customerId === req.user!.id)) throw new ApiError(409, "You already reviewed this product from this order");
    const customer = await db.get<Entity>("users", req.user!.id);
    const review = { id: id("review"), productId: product.id, storeId: product.storeId, orderId: order.id, customerId: req.user!.id, customerName: customer?.fullName ?? "Verified customer", rating: input.rating, comment: input.comment, verifiedPurchase: true, createdAt: now() };
    const nextReviews = [...reviews, review];
    const rating = nextReviews.reduce((sum, item) => sum + Number(item.rating), 0) / nextReviews.length;
    await db.update("products", product.id, { reviews: nextReviews, rating: Number(rating.toFixed(1)), reviewCount: nextReviews.length, updatedAt: now() });
    const storeProducts = (await db.list<Entity>("products")).filter((item) => item.storeId === product.storeId);
    const storeReviews = storeProducts.flatMap((item) => item.id === product.id ? nextReviews : ((item.reviews as Entity[] | undefined) ?? []));
    if (storeReviews.length > 0) {
      const storeRating = storeReviews.reduce((sum, item) => sum + Number(item.rating), 0) / storeReviews.length;
      await db.update("stores", String(product.storeId), { rating: Number(storeRating.toFixed(1)), reviewCount: storeReviews.length });
    }
    created(res, review);
  }));
  router.post("/vendor/products", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const input = productSchema.parse(req.body); const storeId = req.user!.storeId ?? String(req.body.storeId ?? ""); if (!storeId) throw new ApiError(400, "Vendor has no store");
    await enforceProductLimit(db, req);
    const product = await db.create("products", { id: id("product"), ...input, status: input.stock === 0 ? "out_of_stock" : input.status, slug: `${slugify(input.name)}-${Date.now().toString().slice(-5)}`, currency: "NGN", storeId, rating: 0, reviewCount: 0, soldCount: 0, createdAt: now(), updatedAt: now() });
    created(res, product);
  }));
  router.get("/vendor/products", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("products")).filter((p) => p.storeId === req.user!.storeId))));
  router.patch("/vendor/products/:id", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => { const current = await ownedProduct(db, String(req.params.id), req); const patch = productSchema.partial().parse(req.body); const stock = patch.stock ?? Number(current.stock); const status = stock === 0 ? "out_of_stock" : patch.status ?? (current.status === "out_of_stock" ? "active" : current.status); ok(res, await db.update("products", current.id, { ...patch, status, updatedAt: now() })); }));
  router.delete("/vendor/products/:id", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => { const productId = String(req.params.id); await ownedProduct(db, productId, req); await db.remove("products", productId); res.status(204).end(); }));
  router.post("/vendor/products/:id/duplicate", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => { const current = await ownedProduct(db, String(req.params.id), req); await enforceProductLimit(db, req); const copy = { ...current, id: id("product"), name: `${current.name} (Copy)`, slug: `${current.slug}-copy-${Date.now()}`, status: "draft", createdAt: now(), updatedAt: now() }; created(res, await db.create("products", copy)); }));
  return router;
};

async function ownedProduct(db: Database, id: string, req: AuthRequest) { const product = await db.get<Entity>("products", id); if (!product) throw new ApiError(404, "Product not found"); if (req.user!.role !== "admin" && product.storeId !== req.user!.storeId) throw new ApiError(403, "Product belongs to another store"); return product; }

async function enforceProductLimit(db: Database, req: AuthRequest) {
  if (req.user!.role === "admin") return;
  const subscription = await db.findOne<Entity>("subscriptions", { vendorId: req.user!.id });
  if (!subscription || !["active", "trialing"].includes(String(subscription.status)) || Date.parse(String(subscription.currentPeriodEnd)) <= Date.now()) {
    if (subscription?.id && subscription.status !== "past_due") await db.update("subscriptions", subscription.id, { status: "past_due" });
    throw new ApiError(402, "Your monthly subscription has expired. Renew it before adding products.");
  }
  const plan = getSubscriptionPlan(String(subscription.planId));
  if (!plan) throw new ApiError(409, "Your subscription plan is unavailable");
  if (plan.productLimit === null || plan.productLimit === undefined) return;
  const count = (await db.list<Entity>("products")).filter((product) => product.storeId === req.user!.storeId).length;
  if (count >= Number(plan.productLimit)) throw new ApiError(409, `${plan.name} allows ${plan.productLimit} products. Upgrade your plan to add more.`);
}

function mixProductsByStore(products: Entity[]) {
  const groups = new Map<string, Entity[]>();
  for (const product of products) {
    const storeId = String(product.storeId);
    groups.set(storeId, [...(groups.get(storeId) ?? []), product]);
  }
  const mixed: Entity[] = [];
  while (mixed.length < products.length) {
    for (const group of groups.values()) {
      const product = group.shift();
      if (product) mixed.push(product);
    }
  }
  return mixed;
}

function countActiveProductsByStore(products: Entity[]) {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (!isLiveProduct(product)) continue;
    const storeId = String(product.storeId);
    counts.set(storeId, (counts.get(storeId) ?? 0) + 1);
  }
  return counts;
}

function isLiveProduct(product: Entity) {
  return product.status === "active" && Number(product.stock) > 0;
}
