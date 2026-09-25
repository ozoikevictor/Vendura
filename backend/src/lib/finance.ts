import { id, now } from "./helpers.js";
import type { Database, Entity } from "../types.js";

export const PLATFORM_COMMISSION_RATE = 0.05;

export function platformFinanceSummary(transactions: Entity[], payouts: Entity[] = []) {
  const active = transactions.filter((item) => item.status !== "reversed" && item.status !== "failed");
  const commissions = active.filter((item) => item.type === "fee").reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
  const realizedCommissions = active.filter((item) => item.type === "fee" && item.status === "available").reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
  const subscriptions = active.filter((item) => item.type === "subscription").reduce((sum, item) => sum + Number(item.amount), 0);
  const processingFees = active.filter((item) => item.type === "payment_processing_fee").reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
  const refunds = active.filter((item) => item.type === "platform_refund").reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
  const withdrawn = active.filter((item) => item.type === "platform_withdrawal").reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);
  const sellerEntries = active.filter((item) => ["sale", "delivery", "fee", "payout"].includes(String(item.type)));
  const sellerPending = sellerEntries.filter((item) => item.status === "pending").reduce((sum, item) => sum + Number(item.amount), 0);
  const sellerAvailable = sellerEntries.filter((item) => item.status === "available").reduce((sum, item) => sum + Number(item.amount), 0);
  const pendingPayoutAmount = payouts.filter((item) => ["pending", "processing"].includes(String(item.status))).reduce((sum, item) => sum + Number(item.amount), 0);
  const grossRevenue = commissions + subscriptions;
  return {
    commissions,
    subscriptions,
    processingFees,
    refunds,
    grossRevenue,
    withdrawn,
    withdrawable: Math.max(0, realizedCommissions + subscriptions - processingFees - refunds - withdrawn),
    sellerPending: Math.max(0, sellerPending),
    sellerAvailable: Math.max(0, sellerAvailable),
    pendingPayoutAmount,
  };
}

export async function recordPendingEarnings(db: Database, order: Entity) {
  const store = await db.get<Entity>("stores", String(order.storeId));
  if (!store?.ownerId) return;
  const gross = Number(order.subtotal);
  const fee = Math.round(gross * PLATFORM_COMMISSION_RATE * 100) / 100;
  const createdAt = now();
  const status = (order.escrow as Entity | undefined)?.status === "released" ? "available" : "pending";
  if (!await db.findOne<Entity>("transactions", { orderId: order.id, type: "sale" })) {
    await db.create("transactions", {
      id: id("transaction"), vendorId: store.ownerId, type: "sale", amount: gross,
      status, reference: String(order.orderNumber),
      description: `Products sold in ${order.orderNumber}`, orderId: order.id, createdAt
    });
  }
  if (Number(order.deliveryFee) > 0 && !await db.findOne<Entity>("transactions", { orderId: order.id, type: "delivery" })) {
    await db.create("transactions", {
      id: id("transaction"), vendorId: store.ownerId, type: "delivery", amount: Number(order.deliveryFee),
      status, reference: String(order.orderNumber),
      description: `Delivery fee for ${order.orderNumber}`, orderId: order.id, createdAt
    });
  }
  if (!await db.findOne<Entity>("transactions", { orderId: order.id, type: "fee" })) {
    await db.create("transactions", {
      id: id("transaction"), vendorId: store.ownerId, type: "fee", amount: -fee,
      status, reference: String(order.orderNumber),
      description: `Vendura commission (5%)`, orderId: order.id, createdAt
    });
  }
}

export async function releaseEarnings(db: Database, orderId: string) {
  const transactions = (await db.list<Entity>("transactions")).filter((item) =>
    item.orderId === orderId && ["sale", "delivery", "fee"].includes(String(item.type)) && item.status === "pending"
  );
  for (const transaction of transactions) {
    await db.update("transactions", transaction.id, { status: "available", availableAt: now() });
  }
}

export async function reverseEarnings(db: Database, order: Entity) {
  const transactions = (await db.list<Entity>("transactions")).filter((item) =>
    item.orderId === order.id && ["sale", "delivery", "fee"].includes(String(item.type)) && item.status !== "reversed"
  );
  for (const transaction of transactions) {
    await db.update("transactions", transaction.id, { status: "reversed", reversedAt: now() });
  }
}
