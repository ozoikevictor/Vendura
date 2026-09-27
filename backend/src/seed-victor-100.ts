import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { now, slugify } from "./lib/helpers.js";
import type { Entity } from "./types.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase is not configured");
}

const storeId = "store-2d4cfa49-fa6e-4af8-8a26-7d09779c1b58";
const image = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

type ProductGroup = {
  prefix: string;
  categoryId: string;
  basePrice: number;
  imageId: string;
  description: string;
  names: string[];
};

const groups: ProductGroup[] = [
  {
    prefix: "DRS",
    categoryId: "cat-fashion",
    basePrice: 24500,
    imageId: "1566174053879-31528523f8ae",
    description: "A carefully finished dress designed for comfort, confident styling, and repeat wear.",
    names: ["Emerald Ruched Midi Dress", "Satin Cowl Neck Dress", "Floral Tiered Maxi Dress", "Belted Shirt Dress", "One-Shoulder Evening Dress", "Linen Button-Front Dress", "Polka Dot Tea Dress", "Velvet Wrap Cocktail Dress", "Puff-Sleeve Mini Dress", "Pleated Chiffon Occasion Dress"],
  },
  {
    prefix: "MEN",
    categoryId: "cat-fashion",
    basePrice: 18500,
    imageId: "1603252109303-2751441dd157",
    description: "A versatile menswear essential with a clean fit and dependable everyday construction.",
    names: ["Oxford Stripe Long-Sleeve Shirt", "Mandarin Collar Linen Shirt", "Slim-Fit Polo Shirt", "Checked Weekend Shirt", "Cotton Crewneck T-Shirt", "Tailored Navy Blazer", "Relaxed Cargo Trousers", "Tapered Formal Trousers", "Classic Chino Shorts", "Textured Knit Cardigan"],
  },
  {
    prefix: "TRD",
    categoryId: "cat-fashion",
    basePrice: 38000,
    imageId: "1596755389378-c31d21fd1273",
    description: "Modern Nigerian occasion wear made with polished tailoring and distinctive cultural detail.",
    names: ["Royal Blue Senator Set", "Wine Embroidered Kaftan", "Ivory Agbada Three-Piece", "Adire Peplum Skirt Set", "Aso Oke Celebration Gown", "Ankara Palazzo Co-ord", "Brocade Native Two-Piece", "Kente Panel Maxi Dress", "Lace Boubou Occasion Gown", "Dashiki Print Casual Set"],
  },
  {
    prefix: "SHO",
    categoryId: "cat-shoes",
    basePrice: 21000,
    imageId: "1542291026-7eec264c27ff",
    description: "Comfortable footwear with a supportive finish for everyday movement and polished outfits.",
    names: ["Retro Court Sneakers", "Suede Tassel Loafers", "Platform Lace-Up Trainers", "Leather Chelsea Boots", "Square-Toe Slingback Heels", "Braided Strap Sandals", "Chunky Sole Derby Shoes", "Pointed-Toe Court Pumps", "Mesh Walking Trainers", "Embellished Evening Flats"],
  },
  {
    prefix: "BAG",
    categoryId: "cat-accessories",
    basePrice: 15500,
    imageId: "1584917865442-de89df76afd3",
    description: "A practical fashion bag with organized storage and a refined finish for daily use.",
    names: ["Quilted Chain Shoulder Bag", "Pebbled Leather Tote Bag", "Woven Summer Handbag", "Convertible Work Backpack", "Crescent Moon Crossbody Bag", "Structured Top-Handle Purse", "Canvas Weekend Duffle Bag", "Mini Bucket Drawstring Bag", "Laptop Commuter Messenger Bag", "Beaded Occasion Clutch"],
  },
  {
    prefix: "JEW",
    categoryId: "cat-accessories",
    basePrice: 7500,
    imageId: "1515562141207-7a88fb7ce338",
    description: "A distinctive jewellery piece created to add an elegant accent to everyday and occasion looks.",
    names: ["Pearl Drop Earrings", "Twisted Gold Hoop Earrings", "Initial Pendant Necklace", "Crystal Tennis Bracelet", "Stacked Signet Ring Set", "Cowrie Shell Choker", "Rose Gold Bangle Pair", "Emerald Statement Earrings", "Layered Coin Necklace", "Minimal Bar Stud Earrings"],
  },
  {
    prefix: "WAT",
    categoryId: "cat-accessories",
    basePrice: 28500,
    imageId: "1523275335684-37898b6baf30",
    description: "A reliable statement timepiece combining an easy-to-read dial with a polished strap and case.",
    names: ["Rose Gold Mesh Watch", "Midnight Chronograph Watch", "Classic Brown Leather Watch", "Silver Link Bracelet Watch", "Minimal Black Dial Watch", "Two-Tone Everyday Watch", "Square Face Fashion Watch", "Sport Silicone Strap Watch", "Mother-of-Pearl Ladies Watch", "Skeleton Dial Automatic Watch"],
  },
  {
    prefix: "BEA",
    categoryId: "cat-beauty",
    basePrice: 5500,
    imageId: "1596462502278-27bfdc403348",
    description: "A beauty essential selected for an easy routine, comfortable wear, and a polished finish.",
    names: ["Nude Lip Gloss Collection", "Waterproof Brow Pencil Duo", "Radiant Liquid Foundation", "Volumizing Black Mascara", "Soft Glam Eyeshadow Palette", "Setting Spray Mist", "Cream Blush Trio", "Precision Liquid Eyeliner", "Velvet Makeup Sponge Set", "Illuminating Face Highlighter"],
  },
  {
    prefix: "KID",
    categoryId: "cat-fashion",
    basePrice: 12000,
    imageId: "1519238263530-99bdd11df2ea",
    description: "A comfortable children’s fashion piece made for movement, easy dressing, and lasting wear.",
    names: ["Girls Floral Party Dress", "Boys Smart Chino Set", "Kids Ankara Celebration Outfit", "Toddler Denim Overall Set", "Girls Pleated School Skirt", "Boys Cotton Polo Pack", "Kids Hooded Tracksuit", "Girls Tulle Occasion Gown", "Boys Checked Shirt Set", "Kids Printed Pyjama Set"],
  },
  {
    prefix: "ACT",
    categoryId: "cat-fashion",
    basePrice: 13500,
    imageId: "1556821840-3a63f95609a7",
    description: "Breathable activewear designed to support workouts, travel, and relaxed off-duty styling.",
    names: ["High-Waist Training Leggings", "Seamless Sports Bra", "Quick-Dry Running Top", "Zip-Up Training Jacket", "Performance Jogger Trousers", "Ribbed Yoga Shorts", "Oversized Gym T-Shirt", "Compression Training Tights", "Colour-Block Tracksuit Set", "Lightweight Windbreaker"],
  },
];

const catalog = groups.flatMap((group) =>
  group.names.map((name, index) => ({
    name,
    sku: `VF100-${group.prefix}-${String(index + 1).padStart(3, "0")}`,
    categoryId: group.categoryId,
    price: group.basePrice + index * 1750,
    stock: 10 + ((index * 7 + group.prefix.length) % 21),
    description: group.description,
    imageId: group.imageId,
  })),
);

if (catalog.length !== 100 || new Set(catalog.map((product) => product.name)).size !== 100) {
  throw new Error("Victor Fashion catalog must contain exactly 100 uniquely named products");
}

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();

const existing = (await db.list<Entity>("products")).filter(
  (product) => product.storeId === storeId,
);
const existingSkus = new Set(existing.map((product) => String(product.sku)));
let created = 0;

for (const product of catalog) {
  if (existingSkus.has(product.sku)) continue;
  const timestamp = now();
  await db.create("products", {
    id: `product-${randomUUID()}`,
    slug: `${slugify(product.name)}-${product.sku.toLowerCase()}`,
    name: product.name,
    description: product.description,
    images: [image(product.imageId)],
    price: product.price,
    currency: "NGN",
    categoryId: product.categoryId,
    storeId,
    sku: product.sku,
    stock: product.stock,
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
    tags: product.name.toLowerCase().split(/\s+/),
    featured: created < 12,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  created += 1;
}

const allProducts = await db.list<Entity>("products");
const storeTotal = allProducts.filter((product) => product.storeId === storeId).length;
await db.update("stores", storeId, { productCount: storeTotal });

for (const categoryId of new Set(catalog.map((product) => product.categoryId))) {
  const productCount = allProducts.filter(
    (product) => product.categoryId === categoryId && product.status === "active",
  ).length;
  await db.update("categories", categoryId, { productCount });
}

await db.close();
console.log(
  `Victor Fashion 100-product catalog ready. Created ${created}; store now has ${storeTotal} products.`,
);
