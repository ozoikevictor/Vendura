import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { now, slugify } from "./lib/helpers.js";
import type { Entity } from "./types.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured");

const storeId = "store-2d4cfa49-fa6e-4af8-8a26-7d09779c1b58";
const image = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;
const categories = [
  { id: "cat-beauty", slug: "beauty-personal-care", name: "Beauty & Personal Care", icon: "Sparkles" },
  { id: "cat-shoes", slug: "shoes", name: "Shoes", icon: "Footprints" },
  { id: "cat-accessories", slug: "bags-accessories", name: "Bags & Accessories", icon: "ShoppingBag" },
  { id: "cat-plumbing", slug: "plumbing-hardware", name: "Plumbing & Hardware", icon: "Wrench" },
  { id: "cat-home-living", slug: "home-living", name: "Home & Living", icon: "House" },
  { id: "cat-groceries", slug: "groceries", name: "Groceries", icon: "ShoppingBasket" },
] as const;

type Seed = readonly [string, string, string, number, number, string, string];
const catalog: Seed[] = [
  ["Shea Butter Body Cream", "VM-BEA-001", "cat-beauty", 8500, 30, "Rich daily body cream made with nourishing shea butter.", "1556228720-195a672e8a03"],
  ["Vitamin C Face Serum", "VM-BEA-002", "cat-beauty", 12500, 24, "Lightweight brightening serum for a fresh, even-looking complexion.", "1571781926291-c477ebfd024b"],
  ["African Black Soap", "VM-BEA-003", "cat-beauty", 4500, 40, "Gentle traditional cleansing soap for face and body.", "1600857544200-b2f666a9a2ec"],
  ["Hydrating Face Cream", "VM-BEA-004", "cat-beauty", 9800, 28, "Daily facial moisturizer that helps skin feel soft and hydrated.", "1596462502278-27bfdc403348"],
  ["Rose Water Toner", "VM-BEA-005", "cat-beauty", 7000, 32, "Refreshing rose water toner for a simple skincare routine.", "1522335789203-aabd1fc54bc9"],
  ["Coconut Hair Cream", "VM-BEA-006", "cat-beauty", 6500, 35, "Moisturizing hair cream for softness, shine, and easier styling.", "1556228720-195a672e8a03"],
  ["Luxury Body Wash", "VM-BEA-007", "cat-beauty", 7500, 27, "Fragrant body wash with a smooth, refreshing lather.", "1600857544200-b2f666a9a2ec"],
  ["Matte Lipstick Set", "VM-BEA-008", "cat-beauty", 11000, 22, "Long-wear matte lip colors in versatile everyday shades.", "1596462502278-27bfdc403348"],
  ["Classic Leather Loafers", "VM-SHO-009", "cat-shoes", 34000, 18, "Smart leather loafers with a cushioned interior.", "1542291026-7eec264c27ff"],
  ["Canvas Casual Sneakers", "VM-SHO-010", "cat-shoes", 22000, 26, "Easy-wearing canvas sneakers for relaxed everyday outfits.", "1600185365483-26d7a4cc7519"],
  ["Women's Flat Sandals", "VM-SHO-011", "cat-shoes", 16500, 25, "Comfortable flat sandals with simple adjustable straps.", "1543163521-1bf539c55dd2"],
  ["Men's Running Trainers", "VM-SHO-012", "cat-shoes", 38500, 20, "Breathable trainers built for walking, running, and gym sessions.", "1600185365483-26d7a4cc7519"],
  ["Kids School Shoes", "VM-SHO-013", "cat-shoes", 19500, 21, "Durable school shoes with a supportive non-slip sole.", "1542291026-7eec264c27ff"],
  ["Women's Office Heels", "VM-SHO-014", "cat-shoes", 28500, 16, "Polished mid-height heels suitable for work and events.", "1543163521-1bf539c55dd2"],
  ["Lightweight Slide Slippers", "VM-SHO-015", "cat-shoes", 10500, 34, "Water-resistant slides for home, errands, and casual days.", "1542291026-7eec264c27ff"],
  ["Mini Crossbody Bag", "VM-ACC-016", "cat-accessories", 18500, 23, "Compact crossbody bag with an adjustable shoulder strap.", "1584917865442-de89df76afd3"],
  ["Travel Backpack", "VM-ACC-017", "cat-accessories", 32000, 17, "Roomy backpack with padded straps and organized compartments.", "1584917865442-de89df76afd3"],
  ["Leather Card Holder", "VM-ACC-018", "cat-accessories", 9000, 30, "Slim card holder made for essential cards and folded cash.", "1627123424574-724758594e93"],
  ["Silver Hoop Earrings", "VM-ACC-019", "cat-accessories", 11500, 25, "Lightweight polished hoops for daily and occasion wear.", "1515562141207-7a88fb7ce338"],
  ["Beaded Bracelet Set", "VM-ACC-020", "cat-accessories", 8000, 29, "Coordinated bracelet set with colorful polished beads.", "1515562141207-7a88fb7ce338"],
  ["Silk Hair Scarf", "VM-ACC-021", "cat-accessories", 9500, 27, "Smooth printed scarf for protective and decorative styling.", "1601924994987-69e26d50dc26"],
  ["Automatic Wrist Watch", "VM-ACC-022", "cat-accessories", 56000, 11, "Classic automatic watch with a clean dial and metal case.", "1523275335684-37898b6baf30"],
  ["Kitchen Sink Mixer Tap", "VM-PLU-023", "cat-plumbing", 28500, 14, "Durable chrome mixer tap with smooth hot and cold controls.", "1585704032915-c3400ca199e7"],
  ["Bathroom Shower Head", "VM-PLU-024", "cat-plumbing", 14500, 20, "Multi-pattern shower head designed for steady water pressure.", "1585704032915-c3400ca199e7"],
  ["PVC Pipe Set", "VM-PLU-025", "cat-plumbing", 18000, 35, "General-purpose PVC pipe set for household plumbing work.", "1504148455328-c376907d081c"],
  ["Adjustable Pipe Wrench", "VM-PLU-026", "cat-plumbing", 12500, 24, "Heavy-duty adjustable wrench with a comfortable grip.", "1586864387967-d02ef85d93e8"],
  ["Brass Stop Valve", "VM-PLU-027", "cat-plumbing", 6500, 42, "Reliable brass valve for controlling household water lines.", "1585704032915-c3400ca199e7"],
  ["Flexible Sink Hose", "VM-PLU-028", "cat-plumbing", 5500, 40, "Braided flexible hose for sink and bathroom installations.", "1504148455328-c376907d081c"],
  ["Complete Plumber Tool Kit", "VM-PLU-029", "cat-plumbing", 45000, 10, "Practical tool collection for routine plumbing repairs.", "1586864387967-d02ef85d93e8"],
  ["Ceramic Wash Basin", "VM-PLU-030", "cat-plumbing", 52000, 8, "Modern ceramic basin with a clean easy-care finish.", "1585704032915-c3400ca199e7"],
  ["Modern Accent Chair", "VM-HOM-031", "cat-home-living", 85000, 9, "Comfortable accent chair with supportive cushioning.", "1524758631624-e2822e304c36"],
  ["Three-Seater Sofa", "VM-HOM-032", "cat-home-living", 245000, 6, "Spacious upholstered sofa for a welcoming living room.", "1555041469-a586c61ea9bc"],
  ["Cotton Bedsheet Set", "VM-HOM-033", "cat-home-living", 26500, 18, "Soft cotton bedsheet set with matching pillowcases.", "1555041469-a586c61ea9bc"],
  ["Decorative Table Lamp", "VM-HOM-034", "cat-home-living", 22000, 15, "Warm bedside or desk lamp with a compact modern shape.", "1524758631624-e2822e304c36"],
  ["Non-Stick Frying Pan", "VM-HOM-035", "cat-home-living", 17500, 22, "Everyday non-stick pan with a heat-resistant handle.", "1555041469-a586c61ea9bc"],
  ["Stainless Cutlery Set", "VM-HOM-036", "cat-home-living", 15000, 20, "Reusable stainless cutlery set for family dining.", "1524758631624-e2822e304c36"],
  ["Storage Basket Set", "VM-HOM-037", "cat-home-living", 13500, 19, "Versatile woven baskets for shelves, wardrobes, and counters.", "1555041469-a586c61ea9bc"],
  ["Soft Bath Towel Set", "VM-HOM-038", "cat-home-living", 16000, 24, "Absorbent cotton towels in coordinated neutral colors.", "1524758631624-e2822e304c36"],
  ["Premium Long Grain Rice", "VM-GRO-039", "cat-groceries", 48000, 30, "Clean long grain rice packed for family meals.", "1604329760661-e71dc83f8f26"],
  ["Pure Groundnut Oil", "VM-GRO-040", "cat-groceries", 18500, 28, "Filtered cooking oil suitable for frying and everyday meals.", "1474979266404-7eaacbcd87c5"],
  ["Brown Beans Family Pack", "VM-GRO-041", "cat-groceries", 14500, 32, "Carefully sorted brown beans in a convenient family pack.", "1515543904379-3d757afe72e4"],
  ["Breakfast Oats", "VM-GRO-042", "cat-groceries", 7500, 35, "Wholegrain oats for quick, filling breakfast bowls.", "1517673400267-0251440c45dc"],
  ["Natural Honey Jar", "VM-GRO-043", "cat-groceries", 9000, 26, "Smooth natural honey for tea, toast, and cooking.", "1587049352846-4a222e784d38"],
  ["Mixed Spice Collection", "VM-GRO-044", "cat-groceries", 12000, 20, "A useful selection of aromatic spices for everyday recipes.", "1596040033229-a9821ebd058d"],
  ["Men's Senator Two-Piece", "VM-FAS-045", "cat-fashion", 62000, 10, "Tailored senator set with subtle embroidery and a modern fit.", "1596755389378-c31d21fd1273"],
  ["Women's Pleated Midi Dress", "VM-FAS-046", "cat-fashion", 36500, 14, "Elegant pleated midi dress suitable for work and occasions.", "1566174053879-31528523f8ae"],
  ["Unisex Graphic T-Shirt", "VM-FAS-047", "cat-fashion", 14500, 30, "Soft cotton graphic tee with a relaxed unisex cut.", "1603252109303-2751441dd157"],
  ["Tailored Chino Trousers", "VM-FAS-048", "cat-fashion", 25500, 19, "Smart casual chino trousers with a comfortable tapered leg.", "1541099649105-f69ad21f3246"],
  ["Lightweight Bomber Jacket", "VM-FAS-049", "cat-fashion", 42000, 12, "Versatile lightweight jacket with ribbed cuffs and zip closure.", "1551028719-00167b16eac5"],
  ["Matching Family Ankara Set", "VM-FAS-050", "cat-fashion", 95000, 7, "Coordinated Ankara outfits designed for family celebrations.", "1483985988355-763728e1935b"],
];

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();
const currentCategories = await db.list<Entity>("categories");
for (const category of categories) {
  if (!currentCategories.some((item) => item.id === category.id)) {
    await db.create("categories", { ...category, productCount: 0, subcategories: [] });
  }
}

const existing = (await db.list<Entity>("products")).filter((product) => product.storeId === storeId);
const skus = new Set(existing.map((product) => String(product.sku)));
let created = 0;
for (const [name, sku, categoryId, price, stock, description, imageId] of catalog) {
  if (skus.has(sku)) continue;
  const timestamp = now();
  await db.create("products", {
    id: `product-${randomUUID()}`, slug: `${slugify(name)}-${sku.toLowerCase()}`, name, description,
    images: [image(imageId)], price, currency: "NGN", categoryId, storeId, sku, stock,
    lowStockThreshold: 4, rating: 0, reviewCount: 0, soldCount: 0, status: "active",
    negotiable: true, variantOptions: [], variants: [], specifications: [],
    deliveryOptions: [{ id: "standard", label: "Standard delivery", fee: 2500, etaDays: [3, 5] }],
    tags: name.toLowerCase().split(/\s+/), featured: created < 8, createdAt: timestamp, updatedAt: timestamp,
  });
  created += 1;
}

const allProducts = await db.list<Entity>("products");
for (const category of [...currentCategories, ...categories]) {
  const productCount = allProducts.filter((product) => product.categoryId === category.id && product.status === "active").length;
  await db.update("categories", category.id, { productCount });
}
const storeTotal = allProducts.filter((product) => product.storeId === storeId).length;
await db.update("stores", storeId, { productCount: storeTotal, categoryIds: ["cat-fashion", ...categories.map((category) => category.id)] });
await db.close();
console.log(`Mixed catalog ready. Created ${created}; Victor Fashion now has ${storeTotal} products.`);
