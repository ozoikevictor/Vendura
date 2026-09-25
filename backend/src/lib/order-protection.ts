import { config } from "../config.js";
import { ApiError } from "./errors.js";
import { id, now } from "./helpers.js";
import type { Database, Entity } from "../types.js";

export const ORDER_STATUS = {
  PLACED: "placed",
  PAID: "payment_confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  AWAITING_CONFIRMATION: "awaiting_delivery_confirmation",
  PAYOUT_PENDING: "payout_pending",
  COMPLETED: "completed",
  DISPUTED: "disputed",
  REVIEW_REQUIRED: "awaiting_admin_review",
  REFUND_APPROVED: "refund_approved",
  REFUND_PROCESSING: "refund_processing",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const;

export const DELIVERY_METHODS = ["transport_park", "courier", "local_delivery", "customer_pickup", "other"] as const;

export function confirmationDeadline(from = new Date()) {
  return new Date(from.getTime() + config.DELIVERY_CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

export async function transitionOrder(
  db: Database,
  order: Entity,
  newStatus: string,
  actor: { id: string; role: string },
  reason?: string,
  extra: Partial<Entity> = {},
) {
  const at = now();
  const history = {
    id: id("history"), kind: "order_status_history", orderId: order.id,
    previousStatus: order.status, newStatus, actorId: actor.id, actorRole: actor.role,
    reason, createdAt: at,
  };
  await db.create("orderHistory", history);
  return db.update<Entity>("orders", order.id, {
    ...extra,
    status: newStatus,
    timeline: [...((order.timeline as unknown[]) ?? []), { status: newStatus, at, note: reason, actor: actor.role }],
    updatedAt: at,
  });
}

export async function notifyOnce(db: Database, input: Omit<Entity, "id"> & { dedupeKey: string }) {
  const existing = await db.findOne<Entity>("notifications", { dedupeKey: input.dedupeKey });
  if (existing) return existing;
  return db.create("notifications", { id: id("notification"), ...input, read: false, createdAt: now() });
}

export function assertPayoutEligible(order: Entity) {
  if (order.paymentStatus !== "paid") throw new ApiError(409, "Payment has not been verified");
  if (["refunded", "refund_processing", "refund_approved"].includes(String(order.status))) throw new ApiError(409, "This order is being refunded or has been refunded");
  if ((order.escrow as Entity | undefined)?.status === "disputed" || order.status === ORDER_STATUS.DISPUTED) throw new ApiError(409, "An active dispute is holding this payout");
  if (!order.customerConfirmedAt && order.status !== ORDER_STATUS.COMPLETED) throw new ApiError(409, "Delivery has not been confirmed or approved by an administrator");
}

