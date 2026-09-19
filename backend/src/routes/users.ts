import { Router } from "express";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, ok, publicUser } from "../lib/helpers.js";
import { authenticate } from "../middleware/auth.js";
import { addressSchema } from "../schemas.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export const userRoutes = (db: Database) => {
  const router = Router();
  router.use(authenticate);
  router.patch("/me", asyncRoute(async (req: AuthRequest, res) => {
    const allowed = Object.fromEntries(Object.entries(req.body).filter(([key]) => ["fullName", "phone", "avatarUrl"].includes(key)));
    const user = await db.update("users", req.user!.id, allowed);
    if (!user) throw new ApiError(404, "User not found");
    ok(res, publicUser(user));
  }));
  router.get("/me/addresses", asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("addresses")).filter((a) => a.userId === req.user!.id))));
  router.post("/me/addresses", asyncRoute(async (req: AuthRequest, res) => {
    const input = addressSchema.parse(req.body);
    if (input.isDefault) await clearDefaults(db, req.user!.id);
    created(res, await db.create("addresses", { id: id("address"), userId: req.user!.id, ...input }));
  }));
  router.patch("/me/addresses/:id", asyncRoute(async (req: AuthRequest, res) => {
    const address = await ownedAddress(db, String(req.params.id), req.user!.id);
    const patch = addressSchema.partial().parse(req.body);
    if (patch.isDefault) await clearDefaults(db, req.user!.id);
    ok(res, await db.update("addresses", address.id, patch));
  }));
  router.delete("/me/addresses/:id", asyncRoute(async (req: AuthRequest, res) => { const addressId = String(req.params.id); await ownedAddress(db, addressId, req.user!.id); await db.remove("addresses", addressId); res.status(204).end(); }));
  return router;
};
async function ownedAddress(db: Database, id: string, userId: string) { const address = await db.get<Entity>("addresses", id); if (!address) throw new ApiError(404, "Address not found"); if (address.userId !== userId) throw new ApiError(403, "Address belongs to another user"); return address; }
async function clearDefaults(db: Database, userId: string) { for (const address of (await db.list<Entity>("addresses")).filter((a) => a.userId === userId && a.isDefault)) await db.update("addresses", address.id, { isDefault: false }); }
