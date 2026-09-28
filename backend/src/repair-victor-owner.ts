import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { repairStoreOwnerByContactEmail } from "./lib/store-owner.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase is not configured");
}

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();
const result = await repairStoreOwnerByContactEmail(
  db,
  "store-2d4cfa49-fa6e-4af8-8a26-7d09779c1b58",
);
const [owner, store] = await Promise.all([
  db.get("users", result.userId),
  db.get("stores", result.storeId),
]);
if (owner?.role !== "vendor" || owner?.storeId !== result.storeId) {
  throw new Error("Victor Fashion owner account was not converted to a vendor");
}
if (store?.ownerId !== result.userId) {
  throw new Error("Victor Fashion storefront still points to the wrong owner");
}
await db.close();
console.log(`Victor Fashion owner repaired: ${result.email}`);
