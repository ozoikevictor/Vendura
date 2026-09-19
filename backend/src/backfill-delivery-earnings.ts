import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { recordPendingEarnings } from "./lib/finance.js";
import type { Entity } from "./types.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured");

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();
const orders = (await db.list<Entity>("orders")).filter((order) => order.paymentStatus === "paid");
for (const order of orders) await recordPendingEarnings(db, order);
await db.close();
console.log(`Checked ${orders.length} paid order(s) and added any missing delivery earnings.`);
