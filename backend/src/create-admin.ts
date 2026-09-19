import bcrypt from "bcryptjs";
import { config } from "./config.js";
import { SupabaseDatabase } from "./db/supabase.js";
import { id, now } from "./lib/helpers.js";
import type { Entity } from "./types.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase environment variables are required");
if (!email || !adminPassword) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
if (adminPassword.length < 12 || !/[A-Z]/.test(adminPassword) || !/[0-9]/.test(adminPassword) || !/[^A-Za-z0-9]/.test(adminPassword)) {
  throw new Error("Admin password must be at least 12 characters and contain uppercase, number, and symbol characters");
}

const db = new SupabaseDatabase(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
await db.connect();
const existing = await db.findOne<Entity>("users", { email });
const passwordHash = await bcrypt.hash(adminPassword, 12);
const admin = existing
  ? await db.update<Entity>("users", existing.id, { role: "admin", status: "active", passwordHash, emailVerified: true, updatedAt: now(), storeId: undefined })
  : await db.create<Entity>("users", { id: id("user-admin"), fullName: "Vendura Administrator", email, role: "admin", status: "active", passwordHash, emailVerified: true, createdAt: now() });

const temporaryAdmin = await db.findOne<Entity>("users", { email: "admin@vendura.test" });
if (temporaryAdmin && temporaryAdmin.id !== admin?.id) await db.remove("users", temporaryAdmin.id);
await db.close();
console.log(`Permanent admin configured for ${email}. Temporary admin removed.`);
