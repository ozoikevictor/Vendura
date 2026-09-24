import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok } from "../lib/helpers.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export const messageRoutes = (db: Database) => {
  const router = Router(); router.use(["/conversations", "/offers"], authenticate);
  router.get("/conversations", asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("conversations"))
    .filter((c) => c.customerId === req.user!.id || c.storeId === req.user!.storeId)
    .sort((a, b) => new Date(String(b.lastMessageAt)).getTime() - new Date(String(a.lastMessageAt)).getTime()))));
  router.post("/conversations", asyncRoute(async (req: AuthRequest, res) => { const productId = z.string().parse(req.body.productId); const product = await db.get<Entity>("products", productId); if (!product) throw new ApiError(404, "Product not found"); const store = await db.get<Entity>("stores", String(product.storeId)); const user = await db.get<Entity>("users", req.user!.id); const existing = (await db.list<Entity>("conversations")).find((c) => c.productId === productId && c.customerId === req.user!.id); if (existing) return ok(res, existing); created(res, await db.create("conversations", { id: id("conversation"), productId, productName: product.name, productImage: (product.images as string[])[0] ?? "", productPrice: product.price, storeId: product.storeId, storeName: store?.name, customerId: req.user!.id, customerName: user?.fullName, lastMessage: "Conversation started", lastMessageAt: now(), unreadForCustomer: 0, unreadForVendor: 0 })); }));
  router.get("/conversations/:id", asyncRoute(async (req: AuthRequest, res) => ok(res, await accessibleConversation(db, req.params.id, req))));
  router.get("/conversations/:id/messages", asyncRoute(async (req: AuthRequest, res) => { await accessibleConversation(db, req.params.id, req); ok(res, (await db.list<Entity>("messages")).filter((m) => m.conversationId === req.params.id).sort((a, b) => new Date(String(a.sentAt)).getTime() - new Date(String(b.sentAt)).getTime())); }));
  router.post("/conversations/:id/messages", asyncRoute(async (req: AuthRequest, res) => {
    const conversation = await accessibleConversation(db, req.params.id, req);
    const text = z.string().trim().min(1).max(2000).parse(req.body.text);
    const role = conversation.customerId === req.user!.id ? "customer" : "vendor";
    const message = await db.create("messages", { id: id("message"), conversationId: conversation.id, senderId: req.user!.id, senderRole: role, kind: "text", text, sentAt: now(), read: false });
    await db.update("conversations", conversation.id, { lastMessage: text, lastMessageAt: message.sentAt, [role === "customer" ? "unreadForVendor" : "unreadForCustomer"]: Number(conversation[role === "customer" ? "unreadForVendor" : "unreadForCustomer"]) + 1 });

    const store = await db.get<Entity>("stores", String(conversation.storeId));
    const recipientId = role === "customer" ? String(store?.ownerId ?? "") : String(conversation.customerId);
    const recipient = recipientId ? await db.get<Entity>("users", recipientId) : null;
    const preferences = recipient?.notificationPreferences as { newMessages?: boolean } | undefined;
    if (recipientId && preferences?.newMessages !== false) {
      const sender = await db.get<Entity>("users", req.user!.id);
      const senderName = role === "vendor" ? String(store?.name ?? sender?.fullName ?? "A seller") : String(sender?.fullName ?? "A customer");
      await db.create("notifications", {
        id: id("notification"),
        userId: recipientId,
        type: "new_message",
        title: `New message from ${senderName}`,
        body: text,
        href: role === "customer" ? `/vendor/messages/${conversation.id}` : `/messages/${conversation.id}`,
        read: false,
        createdAt: message.sentAt,
      });
    }
    created(res, message);
  }));
  router.post("/conversations/:id/read", asyncRoute(async (req: AuthRequest, res) => { const conversation = await accessibleConversation(db, req.params.id, req); const role = conversation.customerId === req.user!.id ? "customer" : "vendor"; await db.update("conversations", conversation.id, { [role === "customer" ? "unreadForCustomer" : "unreadForVendor"]: 0 }); for (const message of (await db.list<Entity>("messages")).filter((m) => m.conversationId === conversation.id && m.senderRole !== role)) await db.update("messages", message.id, { read: true }); res.status(204).end(); }));
  router.get("/conversations/:id/offers", asyncRoute(async (req: AuthRequest, res) => { await accessibleConversation(db, req.params.id, req); ok(res, (await db.list<Entity>("offers")).filter((o) => o.conversationId === req.params.id)); }));
  router.post("/conversations/:id/offers", asyncRoute(async (req: AuthRequest, res) => { const conversation = await accessibleConversation(db, req.params.id, req); const input = z.object({ offeredPrice: z.number().positive().optional(), counterPrice: z.number().positive().optional() }).parse(req.body); const role = conversation.customerId === req.user!.id ? "customer" : "vendor"; const offer = await db.create("offers", { id: id("offer"), conversationId: conversation.id, productId: conversation.productId, originalPrice: conversation.productPrice, offeredPrice: input.offeredPrice ?? input.counterPrice, counterPrice: input.counterPrice, status: input.counterPrice ? "countered" : "pending", by: role, createdAt: now(), updatedAt: now() }); await db.update("conversations", conversation.id, { activeOfferId: offer.id, lastMessage: `Offer sent: NGN ${offer.offeredPrice}`, lastMessageAt: now() }); created(res, offer); }));
  router.patch("/offers/:id", asyncRoute(async (req: AuthRequest, res) => { const offer = await db.get<Entity>("offers", String(req.params.id)); if (!offer) throw new ApiError(404, "Offer not found"); const conversation = await accessibleConversation(db, String(offer.conversationId), req); const input = z.object({ status: z.enum(["accepted", "rejected", "countered"]), counterPrice: z.number().positive().optional() }).refine((v) => v.status !== "countered" || v.counterPrice, "Counter price is required").parse(req.body); const updated = await db.update("offers", offer.id, { ...input, by: conversation.customerId === req.user!.id ? "customer" : "vendor", updatedAt: now() }); if (input.status === "accepted") await db.update("conversations", conversation.id, { agreedPrice: input.counterPrice ?? offer.counterPrice ?? offer.offeredPrice }); ok(res, updated); }));
  return router;
};
async function accessibleConversation(db: Database, id: string | string[], req: AuthRequest) { const conversation = await db.get<Entity>("conversations", String(id)); if (!conversation) throw new ApiError(404, "Conversation not found"); if (req.user!.role !== "admin" && conversation.customerId !== req.user!.id && conversation.storeId !== req.user!.storeId) throw new ApiError(403, "Conversation belongs to another account"); return conversation; }
