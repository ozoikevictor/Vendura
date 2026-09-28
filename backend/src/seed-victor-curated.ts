import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { now, slugify } from "./lib/helpers.js";
import { repairStoreOwnerByContactEmail } from "./lib/store-owner.js";
import type { Entity } from "./types.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase is not configured");
}

const storeId = "store-2d4cfa49-fa6e-4af8-8a26-7d09779c1b58";
const image = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=82`;

type SeedProduct = readonly [
  name: string,
  sku: string,
  categoryId: string,
  price: number,
  stock: number,
  description: string,
  imageId: string,
];

const catalog: SeedProduct[] = [
  ["Satin Cowl Neck Midi Dress", "VFC-WOM-001", "cat-fashion", 34500, 14, "Elegant satin midi dress with a softly draped neckline and adjustable straps.", "1595777457583-95e059d581b8"],
  ["Belted Linen Shirt Dress", "VFC-WOM-002", "cat-fashion", 32000, 16, "Breathable linen-blend shirt dress with a removable waist belt and side pockets.", "1594633312681-425c7b97ccd1"],
  ["Pleated Chiffon Maxi Dress", "VFC-WOM-003", "cat-fashion", 41500, 11, "Flowing chiffon maxi dress with fine pleats and a comfortable lined finish.", "1566174053879-31528523f8ae"],
  ["Tailored Wide-Leg Jumpsuit", "VFC-WOM-004", "cat-fashion", 38500, 13, "Polished wide-leg jumpsuit with a defined waist and clean tailored lines.", "1594633312681-425c7b97ccd1"],
  ["Ribbed Knit Co-ord Set", "VFC-WOM-005", "cat-fashion", 29500, 18, "Soft ribbed two-piece set designed for effortless smart-casual styling.", "1483985988355-763728e1935b"],
  ["Mandarin Collar Linen Shirt", "VFC-MEN-001", "cat-fashion", 24500, 20, "Lightweight men's linen shirt with a neat mandarin collar and relaxed fit.", "1603252109303-2751441dd157"],
  ["Tailored Navy Blazer", "VFC-MEN-002", "cat-fashion", 52000, 9, "Structured single-breasted blazer with a modern fit for work and occasions.", "1507679799987-c73779587ccf"],
  ["Premium Cargo Trousers", "VFC-MEN-003", "cat-fashion", 28500, 17, "Durable tapered cargo trousers with practical pockets and an adjustable waist.", "1541099649105-f69ad21f3246"],
  ["Textured Knit Polo", "VFC-MEN-004", "cat-fashion", 22500, 21, "Refined knit polo with a breathable texture and comfortable short sleeves.", "1617137968427-85924c800a22"],
  ["Retro Court Sneakers", "VFC-SHO-001", "cat-shoes", 36500, 15, "Low-profile court sneakers with a cushioned footbed and contrast detailing.", "1542291026-7eec264c27ff"],
  ["Leather Chelsea Boots", "VFC-SHO-002", "cat-shoes", 48500, 10, "Versatile ankle boots with elastic side panels and a durable leather finish.", "1608256246200-53e635b5b65f"],
  ["Square-Toe Slingback Heels", "VFC-SHO-003", "cat-shoes", 29500, 12, "Elegant slingback heels with a modern square toe and stable mid-height heel.", "1543163521-1bf539c55dd2"],
  ["Quilted Chain Shoulder Bag", "VFC-BAG-001", "cat-accessories", 32500, 14, "Compact quilted shoulder bag with a polished chain strap and inner pocket.", "1584917865442-de89df76afd3"],
  ["Woven Summer Tote Bag", "VFC-BAG-002", "cat-accessories", 24500, 19, "Roomy woven tote with sturdy handles for errands, holidays, and casual outings.", "1594223274512-ad4803739b7c"],
  ["Convertible Work Backpack", "VFC-BAG-003", "cat-accessories", 38000, 12, "Organized work bag that converts between a backpack and a top-handle carryall.", "1553062407-98eeb64c6a62"],
  ["Rose Gold Mesh Watch", "VFC-WAT-001", "cat-accessories", 44500, 10, "Slim rose-gold watch with a clean dial and adjustable mesh bracelet.", "1523275335684-37898b6baf30"],
  ["Midnight Chronograph Watch", "VFC-WAT-002", "cat-accessories", 58500, 8, "Bold chronograph watch with a dark dial, clear markers, and durable strap.", "1524592094714-0f0654e20314"],
  ["Pearl Drop Earrings", "VFC-JEW-001", "cat-accessories", 14500, 22, "Classic pearl drop earrings with lightweight fittings for comfortable wear.", "1535632066927-ab7c9ab60908"],
  ["Crystal Tennis Bracelet", "VFC-JEW-002", "cat-accessories", 22500, 16, "Refined crystal bracelet with a secure clasp and an elegant continuous setting.", "1611652022419-a9419f74343d"],
  ["Layered Coin Necklace", "VFC-JEW-003", "cat-accessories", 18500, 18, "Two-layer necklace with delicate coin pendants for an easy polished finish.", "1599643478518-a784e5dc4c8f"],
];

if (catalog.length !== 20 || new Set(catalog.map(([name]) => name.toLowerCase())).size !== 20) {
  throw new Error("The curated catalog must contain exactly 20 unique products");
}

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();
await repairStoreOwnerByContactEmail(db, storeId);

const existing = (await db.list<Entity>("products")).filter(
  (product) => product.storeId === storeId,
);
const existingSkus = new Set(existing.map((product) => String(product.sku).toLowerCase()));
const existingNames = new Set(existing.map((product) => String(product.name).trim().toLowerCase()));
let created = 0;

for (const [name, sku, categoryId, price, stock, description, imageId] of catalog) {
  if (existingSkus.has(sku.toLowerCase()) || existingNames.has(name.toLowerCase())) continue;
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
    lowStockThreshold: 5,
    rating: 0,
    reviewCount: 0,
    soldCount: 0,
    status: "active",
    negotiable: true,
    variantOptions: [],
    variants: [],
    specifications: [],
    deliveryOptions: [
      { id: "standard", label: "Standard delivery", fee: 2500, etaDays: [3, 5] },
    ],
    tags: name.toLowerCase().split(/\s+/),
    featured: created < 5,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  created += 1;
}

const allProducts = await db.list<Entity>("products");
const storeTotal = allProducts.filter((product) => product.storeId === storeId).length;
await db.update("stores", storeId, { productCount: storeTotal });

for (const categoryId of new Set(catalog.map(([, , id]) => id))) {
  const productCount = allProducts.filter(
    (product) => product.categoryId === categoryId && product.status === "active",
  ).length;
  await db.update("categories", categoryId, { productCount });
}

await db.close();
console.log(`Created ${created} curated products. Victor Fashion now has ${storeTotal} products.`);
