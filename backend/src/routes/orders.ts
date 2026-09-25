import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok } from "../lib/helpers.js";
import { releaseEarnings, reverseEarnings } from "../lib/finance.js";
import { config } from "../config.js";
import { DELIVERY_METHODS, ORDER_STATUS, assertPayoutEligible, confirmationDeadline, notifyOnce, transitionOrder } from "../lib/order-protection.js";
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

  router.post("/vendor/orders/:id/shipment", authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessibleOrder(db, req.params.id, req);
    if (req.user!.role !== "admin" && order.storeId !== req.user!.storeId) throw new ApiError(403, "Only the seller for this order can submit shipping evidence");
    if (order.paymentStatus !== "paid") throw new ApiError(409, "Do not ship until payment has been verified");
    if (![ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED].includes(String(order.status) as typeof ORDER_STATUS.PROCESSING)) throw new ApiError(409, "This order is not ready for shipping evidence");
    const input = shipmentSchema.parse(req.body);
    const existing = await db.findOne<Entity>("shipments", { kind: "shipment", orderId: order.id });
    if (existing) throw new ApiError(409, "Shipping evidence has already been submitted for this order");
    const submittedAt = now();
    const shipment = await db.create("shipments", {
      id: id("shipment"), kind: "shipment", orderId: order.id, vendorId: req.user!.id,
      customerId: order.customerId, ...input, destination: order.deliveryAddress,
      submittedAt, updatedAt: submittedAt,
    });
    const updated = await transitionOrder(db, order, ORDER_STATUS.SHIPPED, req.user!, "Shipping evidence submitted", {
      shipment, shippedAt: submittedAt, trackingNumber: input.trackingNumber || undefined,
      confirmationDeadline: confirmationDeadline(), payoutStatus: "held",
    });
    await notifyOnce(db, { dedupeKey: `order-shipped:${order.id}`, userId: order.customerId, type: "order_shipped", title: `Order ${order.orderNumber} has shipped`, body: `${order.storeName} submitted shipping details. Confirm only after the order is physically with you.`, href: `/customer/orders/${order.id}` });
    ok(res, updated);
  }));

  router.post("/vendor/orders/:id/request-confirmation", authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessibleOrder(db, req.params.id, req);
    if (![ORDER_STATUS.SHIPPED, ORDER_STATUS.AWAITING_CONFIRMATION].includes(String(order.status) as typeof ORDER_STATUS.SHIPPED)) throw new ApiError(409, "Confirmation can only be requested after shipping");
    if ((order.escrow as Entity | undefined)?.status === "disputed") throw new ApiError(409, "This order has an active dispute");
    const requestedAt = now();
    const deadline = String(order.confirmationDeadline || confirmationDeadline());
    const updated = await transitionOrder(db, order, ORDER_STATUS.AWAITING_CONFIRMATION, req.user!, "Seller requested delivery confirmation", { deliveryClaimedAt: requestedAt, confirmationRequestedAt: requestedAt, confirmationDeadline: deadline });
    await notifyOnce(db, { dedupeKey: `confirmation-request:${order.id}`, userId: order.customerId, type: "confirmation_requested", title: `Confirm delivery for ${order.orderNumber}`, body: "Your seller reported that this order was delivered. Confirm receipt or report a problem before the deadline.", href: `/customer/orders/${order.id}` });
    ok(res, updated);
  }));
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
    if (action.type === "ship") throw new ApiError(400, "Use Add Shipping Evidence to mark this order as shipped");
    if (action.type === "deliver") throw new ApiError(400, "Request customer confirmation instead of marking an order delivered yourself");
    if (action.type === "refund") throw new ApiError(400, "Paid refunds require administrator review and Paystack processing");
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
    const updated = await db.update("orders", order.id, patch);
    const notification = customerNotification(action.type, order, status);
    await createNotification(db, {
      userId: String(order.customerId),
      ...notification,
      href: `/customer/orders/${order.id}`
    });
    ok(res, updated);
  }));
  router.post("/orders/:id/release", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessibleOrder(db, req.params.id, req);
    if (req.user!.role !== "admin" && order.customerId !== req.user!.id) throw new ApiError(403, "Only this customer can confirm receipt");
    if (!order.shipment || ![ORDER_STATUS.SHIPPED, ORDER_STATUS.AWAITING_CONFIRMATION].includes(String(order.status) as typeof ORDER_STATUS.SHIPPED)) throw new ApiError(409, "This order is not awaiting customer confirmation");
    if ((order.escrow as Entity | undefined)?.status !== "held") throw new ApiError(409, "Funds are not currently held");
    if (order.customerConfirmedAt) throw new ApiError(409, "Delivery has already been confirmed");
    assertPayoutEligible({ ...order, customerConfirmedAt: now() });
    await releaseEarnings(db, order.id);
    const confirmedAt = now();
    const updated = await transitionOrder(db, order, ORDER_STATUS.COMPLETED, req.user!, "Customer confirmed physical receipt", { customerConfirmedAt: confirmedAt, payoutStatus: "eligible", escrow: { ...(order.escrow as object), status: "released", releasedAt: confirmedAt } });
    const store = await db.get<Entity>("stores", String(order.storeId));
    if (store?.ownerId) await notifyOnce(db, { dedupeKey: `delivery-confirmed:${order.id}`, userId: store.ownerId, type: "order_delivered", title: `Delivery confirmed for ${order.orderNumber}`, body: "The customer confirmed receipt. Earnings are now available for payout.", href: `/vendor/orders/${order.id}` });
    ok(res, updated);
  }));

  router.post("/orders/:id/disputes", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const input = disputeSchema.parse(req.body);
    const order = await accessibleOrder(db, req.params.id, req);
    if (req.user!.role !== "admin" && order.customerId !== req.user!.id) throw new ApiError(403, "Only this customer can report a problem");
    if (order.paymentStatus !== "paid" || (order.escrow as Entity | undefined)?.status !== "held") throw new ApiError(409, "Only a paid order with held funds can be disputed");
    const current = await db.findOne<Entity>("disputes", { kind: "order_dispute", orderId: order.id, status: "open" });
    if (current) throw new ApiError(409, "A dispute is already open for this order");
    const openedAt = now();
    const dispute = await db.create("disputes", { id: id("dispute"), kind: "order_dispute", orderId: order.id, customerId: order.customerId, vendorId: (await db.get<Entity>("stores", String(order.storeId)))?.ownerId, ...input, status: "open", openedAt, updatedAt: openedAt });
    const updated = await transitionOrder(db, order, ORDER_STATUS.DISPUTED, req.user!, input.reason, { disputeId: dispute.id, payoutStatus: "frozen", escrow: { ...(order.escrow as object), status: "disputed", disputeReason: input.reason, disputeOpenedAt: openedAt } });
    const store = await db.get<Entity>("stores", String(order.storeId));
    if (store?.ownerId) await notifyOnce(db, { dedupeKey: `dispute-vendor:${dispute.id}`, userId: store.ownerId, type: "dispute_opened", title: `Problem reported for ${order.orderNumber}`, body: "The payout is frozen while Vendura reviews the order.", href: `/vendor/orders/${order.id}` });
    const admins = (await db.list<Entity>("users")).filter((user) => user.role === "admin");
    for (const admin of admins) await notifyOnce(db, { dedupeKey: `dispute-admin:${dispute.id}:${admin.id}`, userId: admin.id, type: "dispute_opened", title: `New dispute: ${order.orderNumber}`, body: input.reason, href: "/admin/disputes" });
    ok(res, updated);
  }));

  router.post("/orders/:id/report-seller", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessibleOrder(db, req.params.id, req);
    const reason = z.string().trim().min(10).max(1000).parse(req.body.reason);
    const existing = await db.findOne<Entity>("sellerReports", { kind: "seller_report", orderId: order.id, customerId: req.user!.id });
    if (existing) throw new ApiError(409, "You already reported this seller for this order");
    created(res, await db.create("sellerReports", { id: id("report"), kind: "seller_report", orderId: order.id, storeId: order.storeId, customerId: req.user!.id, reason, status: "open", createdAt: now() }));
  }));
  return router;
};

const evidenceFileSchema = z.object({
  evidenceType: z.enum(["package_photo", "shipping_document", "customer_evidence"]).optional(),
  fileUrl: z.string().refine(validEvidencePayload, "The uploaded file contents do not match a valid JPG, PNG, WebP, or PDF"),
  fileName: z.string().trim().min(1).max(160),
  fileType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  fileSize: z.number().int().positive().max(2_000_000),
  uploadedAt: z.string().datetime().optional(),
});
const shipmentSchema = z.object({ deliveryMethod: z.enum(DELIVERY_METHODS), carrierName: z.string().trim().max(160).optional(), trackingNumber: z.string().trim().max(160).optional(), shippingDate: z.string().datetime(), evidenceFiles: z.array(evidenceFileSchema).min(1).max(4), additionalNote: z.string().trim().max(1000).optional() }).superRefine((value, ctx) => { const formal = ["transport_park", "courier"].includes(value.deliveryMethod); if (formal && !value.carrierName) ctx.addIssue({ code: "custom", path: ["carrierName"], message: "Transport or courier name is required" }); if (formal && !value.trackingNumber) ctx.addIssue({ code: "custom", path: ["trackingNumber"], message: "Waybill or tracking number is required" }); if (!value.evidenceFiles.some((file) => file.evidenceType === "package_photo")) ctx.addIssue({ code: "custom", path: ["evidenceFiles"], message: "A package photo is required" }); if (formal && !value.evidenceFiles.some((file) => file.evidenceType === "shipping_document")) ctx.addIssue({ code: "custom", path: ["evidenceFiles"], message: "A receipt or waybill is required" }); });
const disputeSchema = z.object({ reason: z.enum(["not_received", "seller_did_not_ship", "wrong_product", "not_as_described", "incomplete_package", "damaged", "suspected_fraud", "other"]), description: z.string().trim().min(10).max(2000), evidenceFiles: z.array(evidenceFileSchema).max(4).default([]) });
function validEvidencePayload(value: string) {
  if (/^https:\/\//i.test(value)) return true;
  const match = value.match(/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return false;
  const bytes = Buffer.from(match[3]!, "base64");
  const mime = match[1]!.toLowerCase();
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return bytes.subarray(0, 5).toString() === "%PDF-";
}
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
