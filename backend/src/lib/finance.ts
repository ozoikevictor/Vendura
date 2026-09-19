import { id, now } from "./helpers.js";
import type { Database, Entity } from "../types.js";

export const PLATFORM_COMMISSION_RATE = 0.05;

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
