import { Router } from "express";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { ok } from "../lib/helpers.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export const notificationRoutes = (db: Database) => {
  const router = Router(); router.use("/notifications", authenticate);
  router.get("/notifications", asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("notifications"))
    .filter((n) => n.userId === req.user!.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))))));
  router.patch("/notifications/read-all", asyncRoute(async (req: AuthRequest, res) => { for (const item of (await db.list<Entity>("notifications")).filter((n) => n.userId === req.user!.id)) await db.update("notifications", item.id, { read: true }); res.status(204).end(); }));
  router.patch("/notifications/:id/read", asyncRoute(async (req: AuthRequest, res) => { const item = await db.get<Entity>("notifications", String(req.params.id)); if (!item) throw new ApiError(404, "Notification not found"); if (item.userId !== req.user!.id) throw new ApiError(403, "Notification belongs to another user"); await db.update("notifications", item.id, { read: true }); res.status(204).end(); }));
  return router;
};
