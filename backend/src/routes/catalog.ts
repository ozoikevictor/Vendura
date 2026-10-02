import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok, slugify } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { productSchema } from "../schemas.js";
import type { AuthRequest, Database, Entity } from "../types.js";
import {
  FREE_PRODUCT_LIMIT,
  getSubscriptionPlan,
} from "../lib/subscriptions.js";

export const catalogRoutes = (db: Database) => {
  const router = Router();
  router.get(
    "/categories",
    asyncRoute(async (req, res) => {
      const [categoryItems, products] = await Promise.all([
        db.list<Entity>("categories"),
        db.list<Entity>("products"),
      ]);
      let items = mergeDefaultCategories(categoryItems);
      const activeProducts = products.filter(isLiveProduct);
      const productCounts = new Map<string, number>();
      for (const product of activeProducts) {
        const categoryId = getCanonicalProductCategoryId(product);
        productCounts.set(categoryId, (productCounts.get(categoryId) ?? 0) + 1);
      }
      items = items.map((category) =>
        enrichCategory({
          ...category,
          productCount: productCounts.get(category.id) ?? 0,
        }),
      );
      if (req.query.popular === "true")
        items = items
          .sort((a, b) => Number(b.productCount) - Number(a.productCount))
          .slice(0, Number(req.query.limit ?? 8));
      res.set("Cache-Control", "no-cache, must-revalidate");
      ok(res, items);
    }),
  );
  router.get(
    "/categories/:slug",
    asyncRoute(async (req, res) => {
      const item =
        (await db.findOne<Entity>("categories", { slug: req.params.slug })) ??
        categoryDefaults.find((category) => category.slug === req.params.slug);
      if (!item) throw new ApiError(404, "Category not found");
      const productCount = (await db.list<Entity>("products")).filter(
        (product) =>
          getCanonicalProductCategoryId(product) === item.id &&
          isLiveProduct(product),
      ).length;
      res.set("Cache-Control", "no-cache, must-revalidate");
      ok(res, enrichCategory({ ...item, productCount }));
    }),
  );
  router.get(
    "/categories/:categorySlug/subcategories/:subcategorySlug",
    asyncRoute(async (req, res) => {
      const categorySource =
        (await db.findOne<Entity>("categories", {
          slug: req.params.categorySlug,
        })) ??
        categoryDefaults.find(
          (value) => value.slug === req.params.categorySlug,
        );
      if (!categorySource) throw new ApiError(404, "Subcategory not found");
      const category = enrichCategory(categorySource);
      const item = (category?.subcategories as Entity[] | undefined)?.find(
        (value) => value.slug === req.params.subcategorySlug,
      );
      if (!item) throw new ApiError(404, "Subcategory not found");
      ok(res, item);
    }),
  );
  router.get(
    "/stores",
    asyncRoute(async (req, res) => {
      const [stores, products] = await Promise.all([
        db.list<Entity>("stores"),
        db.list<Entity>("products"),
      ]);
      const activeCounts = countActiveProductsByStore(products);
      let items: Entity[] = stores.map((store) => ({
        ...store,
        productCount: activeCounts.get(store.id) ?? 0,
      }));
      if (req.query.featured === "true") {
        const limit = Number(req.query.limit ?? 6);
        items = items
          .filter((item) => Number(item.productCount) > 0)
          .sort(
            (a, b) =>
              Number(Boolean(b.verified)) - Number(Boolean(a.verified)) ||
              Number(b.productCount) - Number(a.productCount),
          )
          .slice(0, limit);
      }
      res.set("Cache-Control", "no-cache, must-revalidate");
      ok(res, items);
    }),
  );
  router.get(
    "/stores/slug/:slug",
    asyncRoute(async (req, res) => {
      const item = await db.findOne("stores", { slug: req.params.slug });
      if (!item) throw new ApiError(404, "Store not found");
      const products = (await db.list<Entity>("products")).filter(
        (product) => product.storeId === item.id && isLiveProduct(product),
      );
      ok(res, { ...item, productCount: products.length });
    }),
  );
  router.get(
    "/stores/:id",
    asyncRoute(async (req, res) => {
      const item = await db.get("stores", String(req.params.id));
      if (!item) throw new ApiError(404, "Store not found");
      const products = (await db.list<Entity>("products")).filter(
        (product) => product.storeId === item.id && isLiveProduct(product),
      );
      ok(res, { ...item, productCount: products.length });
    }),
  );
  router.get(
    "/storefronts/:slug",
    asyncRoute(async (req, res) => {
      const store = await db.findOne<Entity>("stores", {
        slug: req.params.slug,
      });
      if (!store) throw new ApiError(404, "Storefront not found");
      const products = (await db.list<Entity>("products"))
        .filter(
          (product) => product.storeId === store.id && isLiveProduct(product),
        )
        .map(normalizeCatalogProduct);
      ok(res, { store: { ...store, productCount: products.length }, products });
    }),
  );
  router.get(
    "/products",
    asyncRoute(async (req, res) => {
      const query = z
        .object({
          q: z.string().optional(),
          categorySlug: z.string().optional(),
          subcategorySlug: z.string().optional(),
          audience: z.enum(["men", "women", "unisex", "kids"]).optional(),
          storeId: z.string().optional(),
          minPrice: z.coerce.number().optional(),
          maxPrice: z.coerce.number().optional(),
          negotiableOnly: z.enum(["true", "false"]).optional(),
          inStockOnly: z.enum(["true", "false"]).optional(),
          sort: z
            .enum([
              "relevance",
              "newest",
              "price_asc",
              "price_desc",
              "rating",
              "popular",
            ])
            .default("relevance"),
          page: z.coerce.number().int().positive().default(1),
          pageSize: z.coerce.number().int().min(1).max(100).default(24),
        })
        .parse(req.query);
      let items = (await db.list<Entity>("products"))
        .filter(isLiveProduct)
        .map(normalizeCatalogProduct);
      const categories =
        query.categorySlug || query.subcategorySlug
          ? mergeDefaultCategories(await db.list<Entity>("categories")).map(
              enrichCategory,
            )
          : [];
      if (query.q) {
        const q = query.q.toLowerCase();
        items = items.filter(
          (p) =>
            String(p.name).toLowerCase().includes(q) ||
            String(p.description).toLowerCase().includes(q) ||
            (p.tags as string[]).some((tag) => tag.toLowerCase().includes(q)),
        );
      }
      if (query.categorySlug) {
        const category = categories.find((c) => c.slug === query.categorySlug);
        items = items.filter((p) => p.categoryId === category?.id);
      }
      if (query.subcategorySlug) {
        const subIds = categories
          .flatMap((c) => c.subcategories as Entity[])
          .filter((s) => s.slug === query.subcategorySlug)
          .map((s) => s.id);
        items = items.filter((p) => subIds.includes(String(p.subcategoryId)));
      }
      if (query.audience)
        items = items.filter((p) => p.audience === query.audience);
      if (query.storeId)
        items = items.filter((p) => p.storeId === query.storeId);
      if (query.minPrice !== undefined)
        items = items.filter((p) => Number(p.price) >= query.minPrice!);
      if (query.maxPrice !== undefined)
        items = items.filter((p) => Number(p.price) <= query.maxPrice!);
      if (query.negotiableOnly === "true")
        items = items.filter((p) => p.negotiable);
      if (query.inStockOnly === "true")
        items = items.filter((p) => Number(p.stock) > 0);
      const sorts = {
        relevance: (a: Entity, b: Entity) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          Number(b.soldCount) - Number(a.soldCount),
        newest: (a: Entity, b: Entity) =>
          +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)),
        price_asc: (a: Entity, b: Entity) => Number(a.price) - Number(b.price),
        price_desc: (a: Entity, b: Entity) => Number(b.price) - Number(a.price),
        rating: (a: Entity, b: Entity) => Number(b.rating) - Number(a.rating),
        popular: (a: Entity, b: Entity) =>
          Number(b.soldCount) - Number(a.soldCount),
      };
      items.sort(sorts[query.sort]);
      if (query.sort === "relevance" && !query.storeId)
        items = mixProductsByStore(items);
      const total = items.length;
      items = items.slice(
        (query.page - 1) * query.pageSize,
        query.page * query.pageSize,
      );
      res.set("Cache-Control", "no-cache, must-revalidate");
      ok(res, { items, total, page: query.page, pageSize: query.pageSize });
    }),
  );
  router.get(
    "/products/featured",
    asyncRoute(async (req, res) => {
      const limit = Number(req.query.limit ?? 8);
      const products = (await db.list<Entity>("products"))
        .filter(isLiveProduct)
        .map(normalizeCatalogProduct)
        .sort(
          (a, b) =>
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
            +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)),
        );
      res.set("Cache-Control", "no-cache, must-revalidate");
      ok(res, products.slice(0, limit));
    }),
  );
  router.get(
    "/products/slug/:slug",
    asyncRoute(async (req, res) => {
      const item = await db.findOne("products", { slug: req.params.slug });
      if (!item) throw new ApiError(404, "Product not found");
      ok(res, normalizeCatalogProduct(item));
    }),
  );
  router.get(
    "/products/:id",
    asyncRoute(async (req, res) => {
      const item = await db.get("products", String(req.params.id));
      if (!item) throw new ApiError(404, "Product not found");
      ok(res, normalizeCatalogProduct(item));
    }),
  );
  router.get(
    "/products/:id/related",
    asyncRoute(async (req, res) => {
      const item = await db.get<Entity>("products", String(req.params.id));
      if (!item) throw new ApiError(404, "Product not found");
      const all = await db.list<Entity>("products");
      ok(
        res,
        all
          .map(normalizeCatalogProduct)
          .filter(
            (product) =>
              product.id !== item.id &&
              product.categoryId === getCanonicalProductCategoryId(item) &&
              isLiveProduct(product),
          )
          .slice(0, Number(req.query.limit ?? 4)),
      );
    }),
  );
  router.get(
    "/products/:id/reviews",
    asyncRoute(async (req, res) => {
      const product = await db.get<Entity>("products", String(req.params.id));
      if (!product) throw new ApiError(404, "Product not found");
      const reviews = (product.reviews as Entity[] | undefined) ?? [];
      ok(
        res,
        reviews.sort(
          (a, b) =>
            +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)),
        ),
      );
    }),
  );
  router.post(
    "/products/:id/reviews",
    authenticate,
    authorize("customer", "admin"),
    asyncRoute(async (req: AuthRequest, res) => {
      const input = z
        .object({
          orderId: z.string().min(1),
          rating: z.number().int().min(1).max(5),
          comment: z.string().trim().min(5).max(1000),
        })
        .parse(req.body);
      const product = await db.get<Entity>("products", String(req.params.id));
      if (!product) throw new ApiError(404, "Product not found");
      const order = await db.get<Entity>("orders", input.orderId);
      if (
        !order ||
        (req.user!.role !== "admin" && order.customerId !== req.user!.id)
      )
        throw new ApiError(404, "Delivered order not found");
      if (order.status !== "delivered")
        throw new ApiError(
          409,
          "You can review this product after the order is delivered",
        );
      const items = order.items as Entity[];
      if (!items.some((item) => item.productId === product.id))
        throw new ApiError(400, "This product is not part of that order");
      const reviews = (product.reviews as Entity[] | undefined) ?? [];
      if (
        reviews.some(
          (review) =>
            review.orderId === order.id && review.customerId === req.user!.id,
        )
      )
        throw new ApiError(
          409,
          "You already reviewed this product from this order",
        );
      const customer = await db.get<Entity>("users", req.user!.id);
      const review = {
        id: id("review"),
        productId: product.id,
        storeId: product.storeId,
        orderId: order.id,
        customerId: req.user!.id,
        customerName: customer?.fullName ?? "Verified customer",
        rating: input.rating,
        comment: input.comment,
        verifiedPurchase: true,
        createdAt: now(),
      };
      const nextReviews = [...reviews, review];
      const rating =
        nextReviews.reduce((sum, item) => sum + Number(item.rating), 0) /
        nextReviews.length;
      await db.update("products", product.id, {
        reviews: nextReviews,
        rating: Number(rating.toFixed(1)),
        reviewCount: nextReviews.length,
        updatedAt: now(),
      });
      const storeProducts = (await db.list<Entity>("products")).filter(
        (item) => item.storeId === product.storeId,
      );
      const storeReviews = storeProducts.flatMap((item) =>
        item.id === product.id
          ? nextReviews
          : ((item.reviews as Entity[] | undefined) ?? []),
      );
      if (storeReviews.length > 0) {
        const storeRating =
          storeReviews.reduce((sum, item) => sum + Number(item.rating), 0) /
          storeReviews.length;
        await db.update("stores", String(product.storeId), {
          rating: Number(storeRating.toFixed(1)),
          reviewCount: storeReviews.length,
        });
      }
      created(res, review);
    }),
  );
  router.post(
    "/vendor/products",
    authenticate,
    authorize("vendor", "admin"),
    asyncRoute(async (req: AuthRequest, res) => {
      const input = productSchema.parse(req.body);
      const storeId = req.user!.storeId ?? String(req.body.storeId ?? "");
      if (!storeId) throw new ApiError(400, "Vendor has no store");
      await enforceProductLimit(db, req);
      const product = await db.create("products", {
        id: id("product"),
        ...input,
        status: input.stock === 0 ? "out_of_stock" : input.status,
        slug: `${slugify(input.name)}-${Date.now().toString().slice(-5)}`,
        currency: "NGN",
        storeId,
        rating: 0,
        reviewCount: 0,
        soldCount: 0,
        createdAt: now(),
        updatedAt: now(),
      });
      created(res, product);
    }),
  );
  router.get(
    "/vendor/products",
    authenticate,
    authorize("vendor", "admin"),
    asyncRoute(async (req: AuthRequest, res) =>
      ok(
        res,
        (await db.list<Entity>("products")).filter(
          (p) => p.storeId === req.user!.storeId,
        ),
      ),
    ),
  );
  router.patch(
    "/vendor/products/:id",
    authenticate,
    authorize("vendor", "admin"),
    asyncRoute(async (req: AuthRequest, res) => {
      const current = await ownedProduct(db, String(req.params.id), req);
      const patch = productSchema.partial().parse(req.body);
      const stock = patch.stock ?? Number(current.stock);
      const status =
        stock === 0
          ? "out_of_stock"
          : (patch.status ??
            (current.status === "out_of_stock" ? "active" : current.status));
      ok(
        res,
        await db.update("products", current.id, {
          ...patch,
          status,
          updatedAt: now(),
        }),
      );
    }),
  );
  router.delete(
    "/vendor/products/:id",
    authenticate,
    authorize("vendor", "admin"),
    asyncRoute(async (req: AuthRequest, res) => {
      const productId = String(req.params.id);
      await ownedProduct(db, productId, req);
      await db.remove("products", productId);
      res.status(204).end();
    }),
  );
  router.post(
    "/vendor/products/:id/duplicate",
    authenticate,
    authorize("vendor", "admin"),
    asyncRoute(async (req: AuthRequest, res) => {
      const current = await ownedProduct(db, String(req.params.id), req);
      await enforceProductLimit(db, req);
      const copy = {
        ...current,
        id: id("product"),
        name: `${current.name} (Copy)`,
        slug: `${current.slug}-copy-${Date.now()}`,
        status: "draft",
        createdAt: now(),
        updatedAt: now(),
      };
      created(res, await db.create("products", copy));
    }),
  );
  return router;
};

async function ownedProduct(db: Database, id: string, req: AuthRequest) {
  const product = await db.get<Entity>("products", id);
  if (!product) throw new ApiError(404, "Product not found");
  if (req.user!.role !== "admin" && product.storeId !== req.user!.storeId)
    throw new ApiError(403, "Product belongs to another store");
  return product;
}

async function enforceProductLimit(db: Database, req: AuthRequest) {
  if (req.user!.role === "admin") return;
  const subscription = await db.findOne<Entity>("subscriptions", {
    vendorId: req.user!.id,
  });
  const count = (await db.list<Entity>("products")).filter(
    (product) => product.storeId === req.user!.storeId,
  ).length;
  const hasActiveSubscription = Boolean(
    subscription &&
    ["active", "trialing"].includes(String(subscription.status)) &&
    Date.parse(String(subscription.currentPeriodEnd)) > Date.now(),
  );
  if (!hasActiveSubscription) {
    if (subscription?.id && subscription.status !== "past_due")
      await db.update("subscriptions", subscription.id, { status: "past_due" });
    if (count < FREE_PRODUCT_LIMIT) return;
    throw new ApiError(
      402,
      `You have used all ${FREE_PRODUCT_LIMIT} free product listings. Choose a monthly plan to add more products.`,
    );
  }
  const plan = getSubscriptionPlan(String(subscription!.planId));
  if (!plan) throw new ApiError(409, "Your subscription plan is unavailable");
  if (plan.productLimit === null || plan.productLimit === undefined) return;
  if (count >= Number(plan.productLimit))
    throw new ApiError(
      409,
      `${plan.name} allows ${plan.productLimit} products. Upgrade your plan to add more.`,
    );
}

function normalizeCatalogProduct(product: Entity): Entity {
  const categoryId = getCanonicalProductCategoryId(product);
  const subcategoryId = getCanonicalProductSubcategoryId(product, categoryId);
  const audience = getCanonicalProductAudience(product, categoryId);
  return {
    ...product,
    categoryId,
    ...(subcategoryId ? { subcategoryId } : {}),
    ...(audience ? { audience } : {}),
  };
}

function getCanonicalProductCategoryId(product: Entity) {
  const categoryId = String(product.categoryId ?? "");
  const text = productSearchText(product);
  if (categoryId === "cat-home-living" || categoryId === "cat-home") {
    if (
      /\b(blender|kettle|air fryer|refrigerator|freezer|fan|cooker|lantern|appliance)\b/.test(
        text,
      )
    )
      return "cat-appliances";
    if (
      /\b(kitchen|pan|pot|cutlery|spoon|plate|cookware|storage container|dinner)\b/.test(
        text,
      )
    )
      return "cat-kitchen";
    return "cat-home";
  }
  if (categoryId === "cat-accessories") {
    if (/\b(watch|wrist watch)\b/.test(text)) return "cat-watches";
    if (/\b(earring|bracelet|necklace|jewelry|jewellery)\b/.test(text))
      return "cat-jewelry";
    return "cat-jewelry";
  }
  if (categoryId === "cat-plumbing-hardware") return "cat-plumbing";
  if (categoryId === "cat-beauty-personal-care") return "cat-beauty";
  return categoryId;
}

function getCanonicalProductSubcategoryId(product: Entity, categoryId: string) {
  const current = String(product.subcategoryId ?? "");
  if (current) return current;
  const text = productSearchText(product);
  if (categoryId === "cat-fashion") {
    if (/\b(women|women's|dress|skirt|maxi|pleated)\b/.test(text))
      return "fashion-women-s-fashion";
    if (/\b(men|men's|senator|chino|trouser|shirt)\b/.test(text))
      return "fashion-men-s-fashion";
    if (/\b(unisex|t-shirt|tee)\b/.test(text)) return "fashion-unisex-fashion";
    if (/\b(ankara|traditional)\b/.test(text))
      return "fashion-traditional-wear";
  }
  if (categoryId === "cat-shoes") {
    if (/\b(women|women's|heel|sandals?)\b/.test(text))
      return "shoes-women-s-shoes";
    if (/\b(men|men's|loafers?|trainers?)\b/.test(text))
      return "shoes-men-s-shoes";
    if (/\b(kids?|school)\b/.test(text)) return "shoes-kids-shoes";
    if (/\b(sneakers?)\b/.test(text)) return "shoes-sneakers";
    if (/\b(slides?|slippers?|sandals?)\b/.test(text))
      return "shoes-slippers-sandals";
  }
  if (categoryId === "cat-home") {
    if (/\b(chair|sofa)\b/.test(text)) return "home-furniture-living-room";
    if (/\b(bedsheet|bed|towel)\b/.test(text)) return "home-furniture-bedroom";
    if (/\b(lamp|decorative)\b/.test(text)) return "home-furniture-decor";
    if (/\b(storage|basket|box)\b/.test(text)) return "home-furniture-storage";
  }
  if (categoryId === "cat-kitchen") return "kitchen-equipment-cookware";
  if (categoryId === "cat-appliances") return "appliances-small-appliances";
  return undefined;
}

function getCanonicalProductAudience(product: Entity, categoryId: string) {
  const current = String(product.audience ?? "");
  if (current) return current;
  const text = productSearchText(product);
  if (categoryId !== "cat-fashion" && categoryId !== "cat-shoes")
    return undefined;
  if (/\b(women|women's|dress|skirt|heel|sandals?)\b/.test(text))
    return "women";
  if (/\b(men|men's|senator|chino|loafers?|trainers?)\b/.test(text))
    return "men";
  if (/\b(kids?|school)\b/.test(text)) return "kids";
  if (/\b(unisex|t-shirt|tee|sneakers?|slides?|slippers?)\b/.test(text))
    return "unisex";
  return undefined;
}

function productSearchText(product: Entity) {
  return [
    product.name,
    product.description,
    product.sku,
    ...(((product.tags as string[] | undefined) ?? []) as string[]),
  ]
    .join(" ")
    .toLowerCase();
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

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const sub = (categorySlug: string, names: string[]) =>
  names.map((name) => ({
    id: `${categorySlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    name,
  }));

const categoryVisuals: Record<
  string,
  { imageUrl: string; subcategories?: Entity[] }
> = {
  "phones-electronics": { imageUrl: image("photo-1511707171634-5f897ff02aa9") },
  computers: { imageUrl: image("photo-1496181133206-80ce9b88a853") },
  fashion: {
    imageUrl: image("photo-1483985988355-763728e1935b"),
    subcategories: sub("fashion", [
      "Men's Fashion",
      "Women's Fashion",
      "Unisex Fashion",
      "Kids Fashion",
      "Traditional Wear",
      "Bags & Accessories",
    ]),
  },
  shoes: {
    imageUrl: image("photo-1549298916-b41d501d3772"),
    subcategories: sub("shoes", [
      "Men's Shoes",
      "Women's Shoes",
      "Unisex Shoes",
      "Kids Shoes",
      "Sneakers",
      "Formal Shoes",
      "Slippers & Sandals",
    ]),
  },
  "beauty-hair": { imageUrl: image("photo-1596462502278-27bfdc403348") },
  "jewelry-accessories": {
    imageUrl: image("photo-1515562141207-7a88fb7ce338"),
  },
  watches: { imageUrl: image("photo-1523275335684-37898b6baf30") },
  perfumes: { imageUrl: image("photo-1541643600914-78b084683601") },
  "home-furniture": { imageUrl: image("photo-1555041469-a586c61ea9bc") },
  "kitchen-equipment": { imageUrl: image("photo-1556909114-f6e7ad7d3136") },
  "building-materials": { imageUrl: image("photo-1503387762-592deb58ef4e") },
  "plumbing-materials": { imageUrl: image("photo-1585704032915-c3400ca199e7") },
  automotive: { imageUrl: image("photo-1503376780353-7e6692767b70") },
  "engine-oil-car-accessories": {
    imageUrl: image("photo-1487754180451-c456f719a1fc"),
  },
  books: { imageUrl: image("photo-1495446815901-a7297e633e8d") },
  groceries: { imageUrl: image("photo-1542838132-92c53300491e") },
  sports: { imageUrl: image("photo-1517649763962-0c623066013b") },
  "baby-products": { imageUrl: image("photo-1515488042361-ee00e0ddd4e4") },
  "office-supplies": { imageUrl: image("photo-1497366754035-f200968a6e72") },
  tools: { imageUrl: image("photo-1504148455328-c376907d081c") },
  appliances: {
    imageUrl: image("photo-1570222094114-d054a817e56b"),
  },
  other: { imageUrl: image("photo-1556742049-0cfed4f6a45d") },
};

const categoryDefaults: Entity[] = [
  [
    "cat-electronics",
    "phones-electronics",
    "Phones & Electronics",
    "Smartphone",
  ],
  ["cat-computers", "computers", "Computers", "Laptop"],
  ["cat-fashion", "fashion", "Fashion", "Shirt"],
  ["cat-shoes", "shoes", "Shoes", "Footprints"],
  ["cat-beauty", "beauty-hair", "Beauty & Hair", "Sparkles"],
  ["cat-jewelry", "jewelry-accessories", "Jewelry & Accessories", "Gem"],
  ["cat-watches", "watches", "Watches", "Watch"],
  ["cat-perfumes", "perfumes", "Perfumes", "SprayCan"],
  ["cat-home", "home-furniture", "Home & Furniture", "Sofa"],
  ["cat-kitchen", "kitchen-equipment", "Kitchen Equipment", "CookingPot"],
  ["cat-building", "building-materials", "Building Materials", "BrickWall"],
  ["cat-plumbing", "plumbing-materials", "Plumbing Materials", "Droplets"],
  ["cat-automotive", "automotive", "Automotive", "Car"],
  [
    "cat-engine-oil",
    "engine-oil-car-accessories",
    "Engine Oil & Car Accessories",
    "Fuel",
  ],
  ["cat-books", "books", "Books", "BookOpen"],
  ["cat-groceries", "groceries", "Groceries", "ShoppingBasket"],
  ["cat-sports", "sports", "Sports", "Dumbbell"],
  ["cat-baby", "baby-products", "Baby Products", "Baby"],
  ["cat-office", "office-supplies", "Office Supplies", "Briefcase"],
  ["cat-tools", "tools", "Tools", "Wrench"],
  ["cat-appliances", "appliances", "Appliances", "Refrigerator"],
  ["cat-other", "other", "Other", "Package"],
].map(([id, slug, name, icon]) =>
  enrichCategory({
    id,
    slug,
    name,
    icon,
    productCount: 0,
    subcategories: [],
  }),
);

function mergeDefaultCategories(categories: Entity[]) {
  const bySlug = new Map(
    categories
      .filter((category) => !isLegacyCategory(category))
      .map((category) => [String(category.slug), category]),
  );
  for (const category of categoryDefaults) {
    if (!bySlug.has(String(category.slug)))
      bySlug.set(String(category.slug), category);
  }
  return [...bySlug.values()];
}

function isLegacyCategory(category: Entity) {
  return (
    ["cat-home-living", "cat-accessories"].includes(String(category.id)) ||
    [
      "home-living",
      "bags-accessories",
      "beauty-personal-care",
      "plumbing-hardware",
    ].includes(String(category.slug))
  );
}

function enrichCategory(category: Entity) {
  const visual = categoryVisuals[String(category.slug)] ?? null;
  if (!visual) return category;
  return {
    ...category,
    imageUrl: category.imageUrl ?? visual.imageUrl,
    subcategories: visual.subcategories ?? category.subcategories,
  };
}
