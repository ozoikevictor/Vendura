import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok } from "../lib/helpers.js";
import { releaseEarnings, reverseEarnings } from "../lib/finance.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { orderSchema } from "../schemas.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export const orderRoutes = (db: Database) => {
  const router = Router();
  router.use(["/orders", "/vendor/orders"], authenticate);
  router.post("/orders", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const input = orderSchema.parse(req.body); const user = await db.get<Entity>("users", req.user!.id); const products = await db.list<Entity>("products");
    const groups = new Map<string, typeof input.items>();
    for (const item of input.items) { const product = products.find((p) => p.id === item.productId); if (!product || product.status !== "active") throw new ApiError(400, `Product unavailable: ${item.productId}`); if (Number(product.stock) < item.quantity) throw new ApiError(409, `Insufficient stock: ${product.name}`); const list = groups.get(String(product.storeId)) ?? []; list.push(item); groups.set(String(product.storeId), list); }
    const createdOrders: Entity[] = [];
    for (const [storeId, items] of groups) { const store = await db.get<Entity>("stores", storeId); const orderItems = await Promise.all(items.map(async (item) => { const product = products.find((p) => p.id === item.productId)!; let unitPrice = Number(product.price); if (item.negotiated) { const offer = await db.get<Entity>("offers", item.negotiated.offerId); if (!offer || offer.status !== "accepted" || offer.productId !== item.productId) throw new ApiError(400, "Negotiated offer is invalid"); unitPrice = Number(offer.counterPrice ?? offer.offeredPrice); } const remainingStock = Number(product.stock) - item.quantity; await db.update("products", product.id, { stock: remainingStock, status: remainingStock === 0 ? "out_of_stock" : product.status, soldCount: Number(product.soldCount) + item.quantity }); return { id: id("order-item"), productId: product.id, productName: product.name, productImage: (product.images as string[])[0] ?? "", quantity: item.quantity, unitPrice, negotiated: Boolean(item.negotiated), subtotal: unitPrice * item.quantity }; }));
      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0); const deliveryFee = calculateDeliveryFee(subtotal, input.deliveryMethod); const placedAt = now();
      const order = await db.create("orders", { id: id("order"), orderNumber: `VND-${Date.now().toString().slice(-8)}-${createdOrders.length + 1}`, customerId: req.user!.id, customerName: user?.fullName ?? "Customer", customerPhone: user?.phone ?? input.deliveryAddress.phone, storeId, storeName: store?.name ?? "Store", items: orderItems, subtotal, deliveryFee, total: subtotal + deliveryFee, status: "placed", paymentStatus: "pending", paymentMethod: input.paymentMethod, deliveryAddress: input.deliveryAddress, deliveryMethod: input.deliveryMethod, timeline: [{ status: "placed", at: placedAt }], escrow: { status: "not_funded", amount: subtotal + deliveryFee }, placedAt, hiddenForCustomer: false, hiddenForVendor: false });
      if (store?.ownerId) {
        await createNotification(db, {
          userId: String(store.ownerId),
          type: "new_order",
          title: `New order ${order.orderNumber}`,
          body: `${order.customerName} placed an order worth NGN ${Number(order.total).toLocaleString("en-NG")}.`,
          href: `/vendor/orders/${order.id}`
        });
      }
      createdOrders.push(order); }
    created(res, createdOrders.length === 1 ? createdOrders[0] : createdOrders);
  }));
  router.get("/orders", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("orders")).filter((order) => req.user!.role === "admin" || (order.customerId === req.user!.id && !order.hiddenForCustomer)).sort(byNewestOrder))));
  router.get("/orders/:id", asyncRoute(async (req: AuthRequest, res) => ok(res, await accessibleOrder(db, req.params.id, req))));
  router.get("/vendor/orders", authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("orders")).filter((order) => req.user!.role === "admin" || (order.storeId === req.user!.storeId && !order.hiddenForVendor)).sort(byNewestOrder))));
  router.delete("/orders/:id", authorize("customer", "vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => { const order = await accessibleOrder(db, req.params.id, req); if (req.user!.role === "admin") throw new ApiError(400, "Administrators cannot hide account order history"); const role = order.customerId === req.user!.id ? "customer" : "vendor"; await db.update("orders", order.id, { [role === "customer" ? "hiddenForCustomer" : "hiddenForVendor"]: true }); res.status(204).end(); }));
  router.patch("/vendor/orders/:id/status", authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessibleOrder(db, req.params.id, req);
    const action = z.discriminatedUnion("type", [
      z.object({ type: z.literal("confirm") }),
      z.object({ type: z.literal("start_processing") }),
      z.object({ type: z.literal("ship"), trackingNumber: z.string().trim().min(2) }),
      z.object({ type: z.literal("deliver") }),
      z.object({ type: z.literal("cancel"), reason: z.string().trim().min(2) }),
      z.object({ type: z.literal("refund") })
    ]).parse(req.body);

    const allowedFrom: Record<string, string[]> = {
      confirm: ["placed"],
      start_processing: ["payment_confirmed"],
      ship: ["processing"],
      deliver: ["shipped", "out_for_delivery"],
      cancel: ["placed", "payment_confirmed", "processing"],
      refund: ["payment_confirmed", "processing", "shipped", "delivered"]
    };
    if (!allowedFrom[action.type]?.includes(String(order.status))) {
      throw new ApiError(409, `Cannot ${action.type.replaceAll("_", " ")} an order that is ${String(order.status).replaceAll("_", " ")}`);
    }
    if (action.type === "refund" && order.paymentStatus !== "paid") {
      throw new ApiError(409, "Only a paid order can be refunded");
    }
    if (action.type === "confirm" && order.paymentMethod !== "pay_on_delivery" && order.paymentStatus !== "paid") {
      throw new ApiError(409, "Online payment must be verified before this order can be confirmed");
    }

    const transitions: Record<string, string> = {
      confirm: "payment_confirmed",
      start_processing: "processing",
      ship: "shipped",
      deliver: "delivered",
      cancel: "cancelled"
    };
    const status = transitions[action.type] ?? order.status;
    const patch: Partial<Entity> = {
      status,
      timeline: [
        ...order.timeline as unknown[],
        { status, at: now(), note: "reason" in action ? action.reason : undefined }
      ]
    };
    if (action.type === "ship") patch.trackingNumber = action.trackingNumber;
    if (action.type === "cancel") {
      for (const item of order.items as Entity[]) {
        const product = await db.get<Entity>("products", String(item.productId));
        if (product) {
          const restoredStock = Number(product.stock) + Number(item.quantity);
          await db.update("products", product.id, {
            stock: restoredStock,
            status: restoredStock > 0 && product.status === "out_of_stock" ? "active" : product.status,
            soldCount: Math.max(0, Number(product.soldCount) - Number(item.quantity))
          });
        }
      }
      if (order.paymentStatus === "paid") patch.paymentStatus = "refunded";
      patch.escrow = { ...(order.escrow as object), status: "refunded" };
      if (order.paymentStatus === "paid") await reverseEarnings(db, order);
    }
    if (action.type === "refund") {
      patch.paymentStatus = "refunded";
      patch.escrow = { ...(order.escrow as object), status: "refunded" };
      await reverseEarnings(db, order);
    }
    const updated = await db.update("orders", order.id, patch);
    const notification = customerNotification(action.type, order, status);
    await createNotification(db, {
      userId: String(order.customerId),
      ...notification,
      href: `/customer/orders/${order.id}`
    });
    ok(res, updated);
  }));
  router.post("/orders/:id/release", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => { const order = await accessibleOrder(db, req.params.id, req); if ((order.escrow as Entity | undefined)?.status !== "held") throw new ApiError(409, "Funds are not currently held in escrow"); await releaseEarnings(db, order.id); ok(res, await db.update("orders", order.id, { status: "delivered", escrow: { ...(order.escrow as object), status: "released", releasedAt: now() }, timeline: [...order.timeline as unknown[], { status: "delivered", at: now() }] })); }));
  router.post("/orders/:id/disputes", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => { const reason = z.string().min(10).parse(req.body.reason); const order = await accessibleOrder(db, req.params.id, req); if ((order.escrow as Entity | undefined)?.status !== "held") throw new ApiError(409, "Only held funds can be disputed"); ok(res, await db.update("orders", order.id, { escrow: { ...(order.escrow as object), status: "disputed", disputeReason: reason, disputeOpenedAt: now() } })); }));
  return router;
};
async function accessibleOrder(db: Database, id: string | string[], req: AuthRequest) { const order = await db.get<Entity>("orders", String(id)); if (!order) throw new ApiError(404, "Order not found"); const allowed = req.user!.role === "admin" || order.customerId === req.user!.id || order.storeId === req.user!.storeId; if (!allowed) throw new ApiError(403, "Order belongs to another account"); return order; }

async function createNotification(db: Database, input: Omit<Entity, "id">) {
  return db.create("notifications", { id: id("notification"), ...input, read: false, createdAt: now() });
}

function customerNotification(action: string, order: Entity, status: string): Omit<Entity, "id" | "userId"> {
  const orderNumber = String(order.orderNumber);
  const messages: Record<string, { type: string; title: string; body: string }> = {
    confirm: { type: "order_confirmed", title: `Order ${orderNumber} confirmed`, body: `${order.storeName} has confirmed your order.` },
    start_processing: { type: "order_processing", title: `Order ${orderNumber} is being prepared`, body: `${order.storeName} has started preparing your order.` },
    ship: { type: "order_shipped", title: `Order ${orderNumber} shipped`, body: `Your order from ${order.storeName} is on its way.` },
    deliver: { type: "order_delivered", title: `Order ${orderNumber} delivered`, body: `Your order from ${order.storeName} has been marked as delivered.` },
    cancel: { type: "order_cancelled", title: `Order ${orderNumber} cancelled`, body: `Your order from ${order.storeName} was cancelled.` },
    refund: { type: "order_refunded", title: `Order ${orderNumber} refunded`, body: `Your payment for order ${orderNumber} has been refunded.` }
  };
  return messages[action] ?? { type: "system", title: `Order ${orderNumber} updated`, body: `Your order is now ${status.replaceAll("_", " ")}.` };
}

function calculateDeliveryFee(subtotal: number, method: string) {
  if (method === "pickup" || subtotal >= 500000) return 0;
  return method === "express" ? 5000 : 2500;
}

function byNewestOrder(a: Entity, b: Entity) {
  return +new Date(String(b.placedAt ?? b.createdAt ?? "")) - +new Date(String(a.placedAt ?? a.createdAt ?? ""));
}
