import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { seedDatabase } from "./db/seed.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

try {
  await db.connect();
  await seedDatabase(db);
  const [users, stores, products, categories] = await Promise.all([
    db.list("users"),
    db.list("stores"),
    db.list("products"),
    db.list("categories")
  ]);
  console.log("Supabase connected and seeded successfully.");
  console.log({ users: users.length, stores: stores.length, products: products.length, categories: categories.length });
} finally {
  await db.close();
}
