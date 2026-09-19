import { createApp } from "./app.js";
import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { seedDatabase } from "./db/seed.js";

if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}
const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();
await seedDatabase(db);
const server = createApp(db).listen(config.PORT, () => console.log(`Vendura API listening on http://localhost:${config.PORT}`));

const shutdown = async () => { server.close(); await db.close(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
