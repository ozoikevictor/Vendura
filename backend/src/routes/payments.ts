import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { id, now, ok } from "../lib/helpers.js";
import { recordPendingEarnings } from "../lib/finance.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";

type PaystackResponse<T> = { status: boolean; message: string; data: T };
type InitializedTransaction = { authorization_url: string; access_code: string; reference: string };
type VerifiedTransaction = { status: string; amount: number; currency: string; reference: string; paid_at?: string; channel?: string };

export const paymentRoutes = (db: Database) => {
  const router = Router();
  router.use("/payments", authenticate);

  router.post("/payments/paystack/initialize", asyncRoute(async (req: AuthRequest, res) => {
    if (!config.PAYSTACK_SECRET_KEY) throw new ApiError(503, "Paystack is not configured yet. Add your test secret key to the backend environment.");
    const { orderIds } = z.object({ orderIds: z.array(z.string().min(1)).min(1) }).parse(req.body);
    const orders = await ownedPendingOrders(db, orderIds, req.user!.id);
    const user = await db.get<Entity>("users", req.user!.id);
    if (!user?.email) throw new ApiError(400, "Your account needs an email address before you can pay");
    const reference = `VENDURA-${Date.now()}-${id("pay").slice(-8)}`;
    const amount = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const callbackUrl = `${config.FRONTEND_URL.split(",")[0].replace(/\/$/, "")}/payment/callback`;
    const payment = await paystack<InitializedTransaction>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100),
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: { customerId: req.user!.id, orderIds }
      })
    });
    for (const order of orders) await db.update("orders", order.id, { paymentReference: reference, paymentProvider: "paystack" });
    ok(res, { authorizationUrl: payment.authorization_url, accessCode: payment.access_code, reference });
  }));

  router.get("/payments/paystack/verify/:reference", asyncRoute(async (req: AuthRequest, res) => {
    if (!config.PAYSTACK_SECRET_KEY) throw new ApiError(503, "Paystack is not configured yet");
    const reference = String(req.params.reference);
    const orders = (await db.list<Entity>("orders")).filter((order) => order.paymentReference === reference && order.customerId === req.user!.id);
    if (orders.length === 0) throw new ApiError(404, "No order was found for this payment reference");
    const expectedAmount = Math.round(orders.reduce((sum, order) => sum + Number(order.total), 0) * 100);
    const payment = await paystack<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (payment.status !== "success") throw new ApiError(409, "Payment has not been completed");
    if (payment.amount !== expectedAmount || payment.currency !== "NGN") throw new ApiError(409, "The verified payment amount does not match this order");

    const paidAt = payment.paid_at ?? now();
    const updatedOrders: Entity[] = [];
    for (const order of orders) {
      if (order.paymentStatus === "paid") { updatedOrders.push(order); continue; }
      const updated = await db.update<Entity>("orders", order.id, {
        paymentStatus: "paid",
        status: "payment_confirmed",
        paidAt,
        paymentChannel: payment.channel,
        escrow: { ...(order.escrow as object), status: "held", fundedAt: paidAt },
        timeline: [...order.timeline as unknown[], { status: "payment_confirmed", at: paidAt, note: "Payment verified by Paystack" }]
      });
      if (updated) updatedOrders.push(updated);
      await recordPendingEarnings(db, order);
      const store = await db.get<Entity>("stores", String(order.storeId));
      if (store?.ownerId) await db.create("notifications", {
        id: id("notification"), userId: store.ownerId, type: "payment_received",
        title: `Payment received for ${order.orderNumber}`,
        body: `NGN ${Number(order.total).toLocaleString("en-NG")} has been verified by Paystack.`,
        href: `/vendor/orders/${order.id}`, read: false, createdAt: now()
      });
    }
    ok(res, { reference, orders: updatedOrders });
  }));

  return router;
};

async function ownedPendingOrders(db: Database, orderIds: string[], customerId: string) {
  const uniqueIds = [...new Set(orderIds)];
  const orders = await Promise.all(uniqueIds.map((orderId) => db.get<Entity>("orders", orderId)));
  if (orders.some((order) => !order)) throw new ApiError(404, "One or more orders could not be found");
  const owned = orders as Entity[];
  if (owned.some((order) => order.customerId !== customerId)) throw new ApiError(403, "An order belongs to another customer account");
  if (owned.some((order) => order.paymentMethod === "pay_on_delivery")) throw new ApiError(400, "Pay on Delivery orders do not need online payment");
  if (owned.some((order) => order.paymentStatus !== "pending")) throw new ApiError(409, "One or more orders have already been paid");
  return owned;
}

async function paystack<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...init.headers }
  });
  const payload = await response.json() as PaystackResponse<T>;
  if (!response.ok || !payload.status) throw new ApiError(502, payload.message || "Paystack could not process this request");
  return payload.data;
}
