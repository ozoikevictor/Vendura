import bcrypt from "bcryptjs";
import type { Database, Entity } from "../types.js";
import { SUBSCRIPTION_PLANS } from "../lib/subscriptions.js";

const sub = (root: string, names: string[]) => names.map((name) => ({ id: `${root}-${name.toLowerCase().replace(/\W+/g, "-")}`, slug: name.toLowerCase().replace(/\W+/g, "-"), name }));

export async function seedDatabase(db: Database) {
  if ((await db.list("categories")).length) return;
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const records: Record<string, Entity[]> = {
    users: [
      { id: "user-cust-1", fullName: "Demo Customer", email: "customer@vendura.test", phone: "+2348000000001", passwordHash, role: "customer", emailVerified: true, createdAt: new Date().toISOString() },
      { id: "user-vendor-1", fullName: "Demo Vendor", email: "vendor@vendura.test", phone: "+2348000000002", passwordHash, role: "vendor", storeId: "store-technaija", emailVerified: true, createdAt: new Date().toISOString() },
      { id: "user-admin-1", fullName: "Vendura Admin", email: "admin@vendura.test", passwordHash, role: "admin", emailVerified: true, createdAt: new Date().toISOString() }
    ],
    categories: [
      { id: "cat-electronics", slug: "phones-electronics", name: "Phones & Electronics", icon: "Smartphone", productCount: 1, subcategories: sub("phones-electronics", ["Phones", "Laptops", "Audio"]) },
      { id: "cat-fashion", slug: "fashion", name: "Fashion", icon: "Shirt", productCount: 0, subcategories: sub("fashion", ["Men's Clothing", "Women's Clothing"]) },
      { id: "cat-home", slug: "home-furniture", name: "Home & Furniture", icon: "Sofa", productCount: 0, subcategories: sub("home-furniture", ["Living Room", "Kitchen"]) }
    ],
    stores: [{ id: "store-technaija", slug: "technaija", name: "TechNaija", tagline: "Genuine gadgets, fair prices.", description: "A trusted Nigerian electronics store.", ownerId: "user-vendor-1", categoryIds: ["cat-electronics"], location: { city: "Ikeja", state: "Lagos" }, rating: 4.8, reviewCount: 1240, productCount: 1, followers: 8400, verified: true, allowNegotiation: true, policies: { returns: "7-day returns.", shipping: "Dispatched in 1-2 days.", warranty: "Manufacturer warranty." }, contact: { email: "hello@technaija.ng" }, joinedAt: new Date().toISOString() }],
    products: [{ id: "product-phone-1", slug: "aurora-5g-smartphone", name: "Aurora 5G Smartphone", description: "A fast 5G smartphone.", images: [], price: 245000, currency: "NGN", categoryId: "cat-electronics", storeId: "store-technaija", sku: "AUR-5G", stock: 10, lowStockThreshold: 3, rating: 4.8, reviewCount: 120, soldCount: 890, status: "active", negotiable: true, variantOptions: [], variants: [], specifications: [], deliveryOptions: [{ id: "standard", label: "Standard delivery", fee: 2500, etaDays: [1, 3] }], tags: ["phone", "5g"], featured: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
    plans: SUBSCRIPTION_PLANS.map((plan) => ({ ...plan, features: [...plan.features] })),
    subscriptions: [{ id: "subscription-1", vendorId: "user-vendor-1", planId: "growth", status: "active", currentPeriodStart: new Date().toISOString(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(), autoRenew: true }],
      bankAccounts: [{ id: "user-vendor-1", bankName: "Guaranty Trust Bank", bankCode: "058", accountNumber: "0123456789", accountName: "TECHNAIJA VENTURES", recipientCode: "RCP_test_seed", verified: true }],
    deliverySettings: [{ id: "store-technaija", zones: [{ id: "zone-lagos", name: "Lagos", states: ["Lagos"], fee: 2500, etaDays: [1, 2], active: true }], pickupAvailable: true, pickupAddress: "Computer Village, Ikeja, Lagos" }]
  };
  for (const [collection, items] of Object.entries(records)) for (const item of items) await db.create(collection, item);
}
