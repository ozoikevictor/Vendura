import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok, slugify } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { productSchema } from "../schemas.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export const catalogRoutes = (db: Database) => {
  const router = Router();
  router.get("/categories", asyncRoute(async (req, res) => {
    let items = await db.list<Entity>("categories");
    if (req.query.popular === "true") items = items.sort((a, b) => Number(b.productCount) - Number(a.productCount)).slice(0, Number(req.query.limit ?? 8));
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
    let items = await db.list<Entity>("stores");
    if (req.query.featured === "true") items = items.filter((item) => item.verified).slice(0, Number(req.query.limit ?? 6));
    ok(res, items);
  }));
  router.get("/stores/slug/:slug", asyncRoute(async (req, res) => {
    const item = await db.findOne("stores", { slug: req.params.slug });
    if (!item) throw new ApiError(404, "Store not found");
    ok(res, item);
  }));
  router.get("/stores/:id", asyncRoute(async (req, res) => {
    const item = await db.get("stores", String(req.params.id));
    if (!item) throw new ApiError(404, "Store not found");
    ok(res, item);
  }));
  router.get("/storefronts/:slug", asyncRoute(async (req, res) => {
    const store = await db.findOne<Entity>("stores", { slug: req.params.slug });
    if (!store) throw new ApiError(404, "Storefront not found");
    const products = (await db.list<Entity>("products"))
      .filter((product) => product.storeId === store.id && product.status === "active");
    ok(res, { store, products });
  }));
  router.get("/products", asyncRoute(async (req, res) => {
    const query = z.object({ q: z.string().optional(), categorySlug: z.string().optional(), subcategorySlug: z.string().optional(), storeId: z.string().optional(), minPrice: z.coerce.number().optional(), maxPrice: z.coerce.number().optional(), negotiableOnly: z.enum(["true", "false"]).optional(), inStockOnly: z.enum(["true", "false"]).optional(), sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "rating", "popular"]).default("relevance"), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24) }).parse(req.query);
    let items = await db.list<Entity>("products");
    const categories = await db.list<Entity>("categories");
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
    const total = items.length;
    items = items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    ok(res, { items, total, page: query.page, pageSize: query.pageSize });
  }));
  router.get("/products/featured", asyncRoute(async (req, res) => ok(res, (await db.list<Entity>("products")).filter((p) => p.featured).slice(0, Number(req.query.limit ?? 8)))));
  router.get("/products/slug/:slug", asyncRoute(async (req, res) => { const item = await db.findOne("products", { slug: req.params.slug }); if (!item) throw new ApiError(404, "Product not found"); ok(res, item); }));
  router.get("/products/:id", asyncRoute(async (req, res) => { const item = await db.get("products", String(req.params.id)); if (!item) throw new ApiError(404, "Product not found"); ok(res, item); }));
  router.get("/products/:id/related", asyncRoute(async (req, res) => { const item = await db.get<Entity>("products", String(req.params.id)); if (!item) throw new ApiError(404, "Product not found"); const all = await db.list<Entity>("products"); ok(res, all.filter((p) => p.id !== item.id && p.categoryId === item.categoryId).slice(0, Number(req.query.limit ?? 4))); }));
  router.post("/vendor/products", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const input = productSchema.parse(req.body); const storeId = req.user!.storeId ?? String(req.body.storeId ?? ""); if (!storeId) throw new ApiError(400, "Vendor has no store");
    const product = await db.create("products", { id: id("product"), ...input, slug: `${slugify(input.name)}-${Date.now().toString().slice(-5)}`, currency: "NGN", storeId, rating: 0, reviewCount: 0, soldCount: 0, createdAt: now(), updatedAt: now() });
    created(res, product);
  }));
  router.get("/vendor/products", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("products")).filter((p) => p.storeId === req.user!.storeId))));
  router.patch("/vendor/products/:id", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => { const current = await ownedProduct(db, String(req.params.id), req); const patch = productSchema.partial().parse(req.body); ok(res, await db.update("products", current.id, { ...patch, updatedAt: now() })); }));
  router.delete("/vendor/products/:id", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => { const productId = String(req.params.id); await ownedProduct(db, productId, req); await db.remove("products", productId); res.status(204).end(); }));
  router.post("/vendor/products/:id/duplicate", authenticate, authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => { const current = await ownedProduct(db, String(req.params.id), req); const copy = { ...current, id: id("product"), name: `${current.name} (Copy)`, slug: `${current.slug}-copy-${Date.now()}`, status: "draft", createdAt: now(), updatedAt: now() }; created(res, await db.create("products", copy)); }));
  return router;
};

async function ownedProduct(db: Database, id: string, req: AuthRequest) { const product = await db.get<Entity>("products", id); if (!product) throw new ApiError(404, "Product not found"); if (req.user!.role !== "admin" && product.storeId !== req.user!.storeId) throw new ApiError(403, "Product belongs to another store"); return product; }
