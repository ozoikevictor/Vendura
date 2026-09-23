import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { now, slugify } from "./lib/helpers.js";
import type { Entity } from "./types.js";

const storeId = "store-2881c45c-87f6-4c72-95ba-2f65f517ffda";
const image = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=82`;

type CatalogItem = readonly [string, string, number, number, string, string, string];

const catalog: readonly CatalogItem[] = [
  ["Classic Leather Loafers", "EC-SHOE-001", 42000, 18, "Polished leather loafers for work, events, and everyday smart dressing.", "1549298916-b41d501d3772", "cat-shoes"],
  ["Premium Canvas Sneakers", "EC-SHOE-002", 28500, 24, "Comfortable everyday sneakers with a durable rubber sole and cushioned footbed.", "1525966222134-fcfa99b8ae77", "cat-shoes"],
  ["Women's Block Heel Sandals", "EC-SHOE-003", 32000, 16, "Elegant block heel sandals with a stable base for celebrations and outings.", "1543163521-1bf539c55dd2", "cat-shoes"],
  ["Structured Everyday Handbag", "EC-BAG-004", 45000, 12, "A spacious structured handbag with inner compartments and a detachable strap.", "1584917865442-de89df76afd3", "cat-accessories"],
  ["Quilted Crossbody Bag", "EC-BAG-005", 26000, 20, "Lightweight quilted crossbody bag for errands, travel, and casual days.", "1594223274512-ad4803739b7c", "cat-accessories"],
  ["Classic Denim Jacket", "EC-FASH-006", 38000, 14, "A versatile denim jacket with a timeless fit and durable cotton finish.", "1551028719-00167b16eac5", "cat-fashion"],
  ["Ankara Two-Piece Set", "EC-FASH-007", 52000, 10, "A colourful Ankara two-piece outfit with a comfortable tailored silhouette.", "1596755389378-c31d21fd1273", "cat-fashion"],
  ["Unisex Cotton T-Shirts", "EC-FASH-008", 12500, 35, "Soft cotton t-shirts suitable for everyday wear, layering, and casual styling.", "1521572163474-6864f9cf17ab", "cat-fashion"],
  ["Portable Standing Fan", "EC-HOME-009", 68000, 9, "Quiet portable standing fan with adjustable speed settings for home or office.", "1581092160607-ee22621dd758", "cat-home-living"],
  ["Double-Door Refrigerator", "EC-HOME-010", 485000, 4, "Large-capacity refrigerator with separate freezer storage for busy households.", "1571175443880-49e1d25b2bc5", "cat-home-living"],
  ["Digital Air Fryer", "EC-HOME-011", 78000, 11, "Countertop air fryer with digital controls for quick, low-oil meals.", "1570222094114-d054a817e56b", "cat-home-living"],
  ["Electric Kettle", "EC-HOME-012", 24500, 22, "Fast-boil electric kettle with an easy-pour spout and automatic shut-off.", "1594212699903-ec8a3eca50f5", "cat-home-living"],
  ["Non-Stick Pot Set", "EC-KITCH-013", 115000, 8, "Multi-piece non-stick cookware set for daily family cooking.", "1556911220-bff31c812dba", "cat-home"],
  ["Stainless Steel Spoon Set", "EC-KITCH-014", 18000, 30, "Polished stainless steel spoon set for home dining and entertaining.", "1600891964599-f61ba0e24092", "cat-home"],
  ["Ceramic Dinner Plate Set", "EC-KITCH-015", 36000, 15, "Elegant ceramic dinner plates for everyday meals and special occasions.", "1603199506016-b9a594b593c0", "cat-home"],
  ["Glass Food Storage Set", "EC-KITCH-016", 42000, 18, "Reusable glass storage containers with secure lids for kitchen organisation.", "1583947215259-38e31be8751f", "cat-home"],
  ["Six-Piece Travel Box Set", "EC-STORE-017", 95000, 7, "Stackable travel box set with wheels and secure handles for every trip.", "1584917865442-de89df76afd3", "cat-home-living"],
  ["Large Wheeled Storage Box", "EC-STORE-018", 28000, 21, "Durable wheeled storage box for clothes, toys, linen, and household items.", "1600566753190-17f0baa2a6c3", "cat-home-living"],
  ["Rechargeable Table Lamp", "EC-HOME-019", 22000, 20, "Compact rechargeable table lamp with warm light for bedside or study use.", "1507473885765-e6ed057f782c", "cat-home-living"],
  ["Power Blender", "EC-HOME-020", 62000, 13, "High-power kitchen blender for smoothies, soups, sauces, and everyday prep.", "1570222094114-d054a817e56b", "cat-home-living"],
  ["Two-Burner Gas Cooker", "EC-HOME-021", 58000, 10, "Compact two-burner gas cooker with sturdy pan supports for home cooking.", "1556911220-bff31c812dba", "cat-home-living"],
  ["Rechargeable LED Lantern", "EC-HOME-022", 19500, 26, "Bright rechargeable LED lantern for home backup, travel, and outdoor use.", "1509391366360-2e959784a276", "cat-home-living"],
  ["Women's Casual Maxi Dress", "EC-FASH-023", 29500, 17, "Easy-flowing maxi dress with a comfortable fit for casual occasions.", "1496747611176-843222e1e57c", "cat-fashion"],
  ["Men's Smart Casual Shirt", "EC-FASH-024", 24000, 20, "Breathable smart-casual shirt that works for office days and weekends.", "1603252109303-2751441dd157", "cat-fashion"],
];

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase is not configured");
}

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();

const store = await db.get<Entity>("stores", storeId);
if (!store) throw new Error(`Edera store not found: ${storeId}`);

const existing = (await db.list<Entity>("products")).filter((product) => product.storeId === storeId);
const existingSkus = new Set(existing.map((product) => String(product.sku)));
let created = 0;

for (const [name, sku, price, stock, description, imageId, categoryId] of catalog) {
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
  } as Entity);
  created += 1;
}

const total = (await db.list<Entity>("products")).filter((product) => product.storeId === storeId).length;
await db.update("stores", storeId, { productCount: total });
await db.close();
console.log(`Edera Collection catalog ready. Created ${created}; store now has ${total} products.`);
