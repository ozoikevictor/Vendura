import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";
import { asyncRoute } from "../lib/errors.js";
import { id, now } from "../lib/helpers.js";
import type { AuthRequest, Database, Entity } from "../types.js";

type TransferEvent = {
  event: "transfer.success" | "transfer.failed" | "transfer.reversed" | string;
  data?: { reference?: string; amount?: number; currency?: string; transferred_at?: string; reason?: string };
};

type RefundEvent = {
  event: "refund.pending" | "refund.processing" | "refund.needs-attention" | "refund.failed" | "refund.processed" | string;
  data?: { transaction_reference?: string; refund_reference?: string; amount?: string | number; currency?: string; status?: string };
};

export const webhookRoutes = (db: Database) => {
  const router = Router();
  router.post("/webhooks/paystack", asyncRoute(async (req: AuthRequest, res) => {
    if (!config.PAYSTACK_SECRET_KEY || !req.rawBody || !validSignature(req.rawBody, req.header("x-paystack-signature"))) {
      res.status(401).json({ error: { message: "Invalid Paystack signature" } });
      return;
    }
    const event = req.body as TransferEvent & RefundEvent;
    if (event.event.startsWith("refund.") && event.data?.transaction_reference) {
      const refund = await db.findOne<Entity>("refunds", { kind: "refund", transactionReference: event.data.transaction_reference });
      if (!refund || event.data.currency !== "NGN" || Number(event.data.amount) !== Math.round(Number(refund.amount) * 100)) { res.sendStatus(200); return; }
      const providerStatus = event.event.replace("refund.", "");
      if (refund.providerStatus !== providerStatus) {
        await db.update("refunds", refund.id, { providerStatus, refundReference: event.data.refund_reference ?? refund.refundReference, updatedAt: now(), completedAt: providerStatus === "processed" ? now() : undefined });
        const order = await db.get<Entity>("orders", String(refund.orderId));
        if (order && providerStatus === "processed") await db.update("orders", order.id, { status: "refunded", paymentStatus: "refunded", refundStatus: "refunded", escrow: { ...(order.escrow as object), status: "refunded" }, timeline: [...((order.timeline as unknown[]) ?? []), { status: "refunded", at: now(), note: "Paystack confirmed the refund" }] });
        if (order && providerStatus === "failed") await db.update("orders", order.id, { status: "disputed", refundStatus: "failed", timeline: [...((order.timeline as unknown[]) ?? []), { status: "disputed", at: now(), note: "Paystack reported that the refund failed" }] });
        if (order) await db.create("notifications", { id: id("notification"), userId: order.customerId, type: "refund_update", title: `Refund update for ${order.orderNumber}`, body: providerStatus === "processed" ? "Paystack has processed your refund." : `Your refund status is now ${providerStatus.replaceAll("-", " ")}.`, href: `/customer/orders/${order.id}`, read: false, createdAt: now(), dedupeKey: `refund:${refund.id}:${providerStatus}` });
      }
      res.sendStatus(200); return;
    }
    if (!["transfer.success", "transfer.failed", "transfer.reversed"].includes(event.event) || !event.data?.reference) {
      res.sendStatus(200);
      return;
    }
    const payout = await db.findOne<Entity>("payouts", { reference: event.data.reference });
    if (!payout || event.data.currency !== "NGN" || event.data.amount !== Math.round(Number(payout.amount) * 100)) {
      res.sendStatus(200);
      return;
    }
    const isSuccess = event.event === "transfer.success";
    const finalStatus = isSuccess ? "paid" : "failed";
    const canApply = isSuccess
      ? payout.status === "processing"
      : event.event === "transfer.reversed" ? ["processing", "paid"].includes(String(payout.status)) : payout.status === "processing";
    if (canApply && payout.status !== finalStatus) {
      await db.update("payouts", payout.id, isSuccess
        ? { status: "paid", paidAt: event.data.transferred_at ?? now(), providerStatus: "success" }
        : { status: "failed", failedAt: now(), providerStatus: event.event, failureReason: event.data.reason ?? "Transfer failed or was reversed" });
      const ledger = await db.findOne<Entity>("transactions", { reference: event.data.reference, type: "payout" });
      if (!isSuccess && ledger?.status !== "reversed") await db.update("transactions", ledger!.id, { status: "reversed", reversedAt: now() });
      await db.create("notifications", {
        id: id("notification"), userId: payout.vendorId, type: "payout_processed",
        title: isSuccess ? "Payout completed" : "Payout failed",
        body: isSuccess ? `NGN ${Number(payout.amount).toLocaleString("en-NG")} was sent to your bank account.` : "Your payout could not be completed. The amount is available to request again.",
        href: "/vendor/payouts", read: false, createdAt: now()
      });
    }
    res.sendStatus(200);
  }));
  return router;
};

function validSignature(body: Buffer, signature?: string) {
  if (!signature) return false;
  const expected = createHmac("sha512", config.PAYSTACK_SECRET_KEY!).update(body).digest("hex");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
