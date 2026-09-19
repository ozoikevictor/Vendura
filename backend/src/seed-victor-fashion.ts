import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { now, slugify } from "./lib/helpers.js";
import type { Entity } from "./types.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase is not configured");
}

const storeId = "store-2d4cfa49-fa6e-4af8-8a26-7d09779c1b58";
const categoryId = "cat-fashion";
const image = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

const catalog = [
  ["Ankara Wrap Dress", "VF-DRESS-001", 38500, 14, "Vibrant Ankara wrap dress with a flattering adjustable waist.", "1566174053879-31528523f8ae"],
  ["Classic White Sneakers", "VF-SHOE-002", 32500, 20, "Clean everyday sneakers with a cushioned sole and durable finish.", "1542291026-7eec264c27ff"],
  ["Minimalist Wrist Watch", "VF-WATCH-003", 42000, 12, "A refined unisex wrist watch for work, weekends, and special occasions.", "1523275335684-37898b6baf30"],
  ["Oversized Sunglasses", "VF-GLASS-004", 14500, 25, "UV-protective fashion sunglasses with a comfortable oversized frame.", "1511499767150-a48a237f0083"],
  ["Structured Leather Handbag", "VF-BAG-005", 48000, 10, "Spacious structured handbag with inner pockets and a detachable strap.", "1584917865442-de89df76afd3"],
  ["Signature Eau de Parfum", "VF-PERF-006", 28500, 18, "A lasting floral and woody fragrance designed for everyday elegance.", "1541643600914-78b084683601"],
  ["Layered Gold Necklace", "VF-JEWL-007", 19500, 16, "Delicate layered necklace that adds a polished finish to any outfit.", "1515562141207-7a88fb7ce338"],
  ["Men's Oxford Shirt", "VF-SHIRT-008", 24500, 22, "Smart cotton Oxford shirt with a modern fit and neat button-down collar.", "1603252109303-2751441dd157"],
  ["Premium Denim Jeans", "VF-JEANS-009", 29500, 18, "Comfort-stretch denim jeans with a versatile straight-leg cut.", "1541099649105-f69ad21f3246"],
  ["Women's Block Heels", "VF-HEEL-010", 27500, 15, "Elegant block heels with a stable base and softly padded footbed.", "1543163521-1bf539c55dd2"],
  ["Essential Pullover Hoodie", "VF-HOOD-011", 26000, 24, "Soft heavyweight hoodie with a relaxed fit and roomy front pocket.", "1556821840-3a63f95609a7"],
  ["Everyday Baseball Cap", "VF-CAP-012", 9500, 30, "Adjustable cotton cap with a curved brim and breathable construction.", "1588850561407-ed78c282e89b"],
  ["Classic Leather Belt", "VF-BELT-013", 13500, 28, "Genuine leather belt finished with a simple brushed-metal buckle.", "1553062407-98eeb64c6a62"],
  ["Slim Leather Wallet", "VF-WALLET-014", 16500, 20, "Compact leather wallet with organized card slots and a cash sleeve.", "1627123424574-724758594e93"],
  ["Urban Denim Jacket", "VF-JACKET-015", 36000, 13, "Mid-weight denim jacket with a timeless cut and practical chest pockets.", "1551028719-00167b16eac5"],
  ["Kids Weekend Outfit", "VF-KIDS-016", 22000, 17, "Comfortable coordinated children's outfit made for active weekends.", "1519238263530-99bdd11df2ea"],
  ["Performance Running Shoes", "VF-RUN-017", 39500, 19, "Lightweight running shoes with breathable uppers and responsive cushioning.", "1600185365483-26d7a4cc7519"],
  ["Embroidered Native Set", "VF-NATIVE-018", 55000, 9, "A polished traditional two-piece set with detailed embroidery.", "1596755389378-c31d21fd1273"],
  ["Printed Satin Scarf", "VF-SCARF-019", 12000, 26, "Smooth printed satin scarf that can be styled around the neck or hair.", "1601924994987-69e26d50dc26"],
  ["Curated Fashion Essentials", "VF-SET-020", 68000, 8, "A coordinated selection of modern wardrobe essentials for effortless styling.", "1483985988355-763728e1935b"],
] as const;

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();
const existing = (await db.list<Entity>("products")).filter((product) => product.storeId === storeId);
const existingSkus = new Set(existing.map((product) => String(product.sku)));
let created = 0;

for (const [name, sku, price, stock, description, imageId] of catalog) {
  if (existingSkus.has(sku)) continue;
  const timestamp = now();
  await db.create("products", {
    id: `product-${randomUUID()}`,
    slug: `${slugify(name)}-${sku.toLowerCase()}`,
    name,
    description,
    images: [image(imageId)],
    price,
    currency: "NGN",
    categoryId,
    storeId,
    sku,
    stock,
    lowStockThreshold: 4,
    rating: 0,
    reviewCount: 0,
    soldCount: 0,
    status: "active",
    negotiable: true,
    variantOptions: [],
    variants: [],
    specifications: [],
    deliveryOptions: [{ id: "standard", label: "Standard delivery", fee: 2500, etaDays: [3, 5] }],
    tags: name.toLowerCase().split(/\s+/),
    featured: created < 6,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  created += 1;
}

const total = (await db.list<Entity>("products")).filter((product) => product.storeId === storeId).length;
await db.update("stores", storeId, { productCount: total });
await db.close();
console.log(`Victor Fashion catalog ready. Created ${created}; store now has ${total} products.`);
