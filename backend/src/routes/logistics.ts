import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { id, now, ok } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { destinationSchema, parcelSchema, destinationFingerprint, itemsFingerprint, providers, logisticsMode, requireSandbox, bookOrderDelivery, deliveryStatuses } from "../lib/logistics.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export function logisticsRoutes(db: Database) {
  const router = Router();
  router.get("/logistics/providers", (_req, res) => ok(res, { mode: logisticsMode(), providers: providers().map(({ id, name, sandbox, capabilities }) => ({ id, name, sandbox, capabilities })) }));
  router.use("/logistics", authenticate);
  router.post("/logistics/quotes", authorize("customer", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    requireSandbox();
    const input = z.object({ address: destinationSchema, items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive().max(1000) })).min(1).max(100) }).parse(req.body);
    const products = await db.list<Entity>("products");
    const groups = new Map<string, typeof input.items>();
    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.status !== "active" || Number(product.stock) < item.quantity) throw new ApiError(409, "A cart item is no longer available.");
      const storeId = String(product.storeId);
      groups.set(storeId, [...(groups.get(storeId) ?? []), item]);
    }
    const shipments = [];
    for (const [storeId, items] of groups) {
      const store = await db.get<Entity>("stores", storeId);
      if (!store) throw new ApiError(404, "Vendor store not found.");
      const settings = await db.get<Entity>("deliverySettings", storeId);
      const location = store.location as { city?: string; state?: string } | undefined;
      const pickup = { address: settings?.pickupAddress ?? "Pickup address required before live launch", city: location?.city ?? "", state: location?.state ?? "" };
      const interstate = String(location?.state ?? "").toLowerCase() !== input.address.state.toLowerCase();
      const measured = items.map((item) => ({ item, parcel: parcelSchema.safeParse(products.find((p) => p.id === item.productId)?.parcel) }));
      const complete = measured.every((entry) => entry.parcel.success);
      const parcel = { weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 };
      for (const entry of measured) {
        const p = entry.parcel.success ? entry.parcel.data : { weightKg: 1, lengthCm: 20, widthCm: 20, heightCm: 10 };
        parcel.weightKg += p.weightKg * entry.item.quantity;
        parcel.lengthCm = Math.max(parcel.lengthCm, p.lengthCm);
        parcel.widthCm = Math.max(parcel.widthCm, p.widthCm);
        parcel.heightCm += p.heightCm * entry.item.quantity;
      }
      const quotes = [];
      for (const provider of providers()) {
        for (const option of await provider.quote({ interstate, parcel })) {
          const quote = await db.create("logistics", { id: id("delivery-quote"), kind: "delivery_quote", customerId: req.user!.id, storeId, providerId: provider.id, providerName: provider.name, sandbox: true, ...option, currency: "NGN", deliveryType: interstate ? "interstate" : "local", pickup, parcel, parcelSource: complete ? "product_records" : "sandbox_fixture", addressFingerprint: destinationFingerprint(input.address), itemsFingerprint: itemsFingerprint(items), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), createdAt: now() });
          quotes.push(quote);
        }
      }
      shipments.push({ storeId, storeName: store.name, quotes });
    }
    ok(res, { sandbox: true, shipments });
  }));
  router.get("/logistics/bookings", authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const rows = await db.list<Entity>("logistics");
    ok(res, rows.filter((row) => row.kind === "delivery_booking" && (req.user!.role === "admin" || row.storeId === req.user!.storeId)));
  }));
  router.get("/logistics/logs", authorize("admin"), asyncRoute(async (_req, res) => ok(res, (await db.list<Entity>("logistics")).filter((row) => row.kind === "logistics_log"))));
  router.get("/logistics/orders/:orderId", asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessible(db, req);
    const booking = await db.get<Entity>("logistics", `delivery-${order.id}`);
    ok(res, { booking, orderId: order.id, customerConfirmedAt: order.customerConfirmedAt ?? null, paymentStatus: order.paymentStatus, status: order.status });
  }));
  router.get("/logistics/orders/:orderId/stream", asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessible(db, req);
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "Connection": "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    let stopped = false;
    let reading = false;
    let previous = "";
    const publish = async () => {
      if (stopped || reading) return;
      reading = true;
      try {
        const booking = await db.get<Entity>("logistics", `delivery-${order.id}`);
        const payload = JSON.stringify({ booking });
        if (!stopped) { res.write(payload === previous ? ": heartbeat\n\n" : `data: ${payload}\n\n`); previous = payload; }
      } catch { if (!stopped) res.end(); }
      finally { reading = false; }
    };
    const interval = setInterval(() => void publish(), 5000);
    const lifetime = setTimeout(() => res.end(), 5 * 60_000);
    res.on("close", () => { stopped = true; clearInterval(interval); clearTimeout(lifetime); });
    await publish();
  }));
  router.post("/logistics/orders/:orderId/book", asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessible(db, req);
    if (req.user!.role !== "admin" && order.customerId !== req.user!.id) throw new ApiError(403, "Only the customer or an administrator may request booking.");
    ok(res, await bookOrderDelivery(db, order));
  }));
  router.post("/logistics/orders/:orderId/ready", authorize("vendor", "admin"), asyncRoute(async (req: AuthRequest, res) => {
    const order = await accessible(db, req);
    if (order.paymentStatus !== "paid") throw new ApiError(409, "Payment must be verified first.");
    const booking = await db.get<Entity>("logistics", `delivery-${order.id}`);
    if (!booking || ["cancelled", "booking_failed", "provider_delivered"].includes(String(booking.status))) throw new ApiError(409, "No active delivery booking.");
    ok(res, await db.update("logistics", booking.id, { packageReadyAt: booking.packageReadyAt ?? now(), packageReadyBy: req.user!.id }));
  }));
  router.post("/logistics/orders/:orderId/sandbox-event", authorize("admin"), asyncRoute(async (req: AuthRequest, res) => {
    requireSandbox();
    const order = await accessible(db, req);
    const { status, eventId } = z.object({ status: z.enum(deliveryStatuses), eventId: z.string().min(1).max(100) }).parse(req.body);
    const booking = await db.get<Entity>("logistics", `delivery-${order.id}`);
    if (!booking?.sandbox || ["cancelled", "booking_failed"].includes(String(booking.status))) throw new ApiError(409, "An active sandbox booking is required.");
    const events = (booking.events ?? []) as Array<{ id: string; status: string; at: string; source: string }>;
    if (events.some((event) => event.id === eventId)) { ok(res, booking); return; }
    if (deliveryStatuses.indexOf(status) <= deliveryStatuses.indexOf(booking.status as typeof deliveryStatuses[number])) throw new ApiError(409, "Delivery events cannot move backwards.");
    const at = now();
    ok(res, await db.update("logistics", booking.id, { status, events: [...events, { id: eventId, status, at, source: "sandbox_admin" }], updatedAt: at }));
    // Sandbox events never transition real orders or release seller earnings.
  }));
  router.post("/logistics/orders/:orderId/cancel", asyncRoute(async (req: AuthRequest, res) => {
    requireSandbox();
    const order = await accessible(db, req);
    if (req.user!.role !== "admin" && order.customerId !== req.user!.id) throw new ApiError(403, "Only the customer or an administrator may cancel delivery.");
    const booking = await db.get<Entity>("logistics", `delivery-${order.id}`);
    if (!booking) throw new ApiError(404, "Delivery booking not found.");
    if (booking.status === "cancelled") { ok(res, booking); return; }
    if (!["booked", "rider_assigned", "travelling_to_pickup", "booking_failed"].includes(String(booking.status))) throw new ApiError(409, "Contact support to cancel a shipment already collected.");
    if (booking.reference) await providers()[0]!.cancel(String(booking.reference));
    ok(res, await db.update("logistics", booking.id, { status: "cancelled", cancelledAt: now(), refundStatus: "admin_review_required", events: [...(booking.events as unknown[] ?? []), { id: id("event"), status: "cancelled", at: now(), source: "sandbox" }] }));
  }));
  return router;
}
async function accessible(db: Database, req: AuthRequest) {
  const order = await db.get<Entity>("orders", String(req.params.orderId));
  if (!order) throw new ApiError(404, "Order not found.");
  if (!(req.user!.role === "admin" || order.customerId === req.user!.id || (req.user!.role === "vendor" && req.user!.storeId && order.storeId === req.user!.storeId))) throw new ApiError(403, "This order belongs to another account.");
  return order;
}
