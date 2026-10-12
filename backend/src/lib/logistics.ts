import { createHash } from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";
import { ApiError } from "./errors.js";
import { id, now } from "./helpers.js";
import { notifyOnce } from "./order-protection.js";
import type { Database, Entity } from "../types.js";

export const coordinatesSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export const destinationSchema = z.object({
  fullName: z.string().trim().min(2).max(160), phone: z.string().trim().min(7).max(30),
  street: z.string().trim().min(3).max(300), city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100), landmark: z.string().trim().max(300).optional(),
  instructions: z.string().trim().max(1000).optional(), coordinates: coordinatesSchema.optional(),
});
export type Destination = z.infer<typeof destinationSchema>;
export const parcelSchema = z.object({ weightKg: z.number().positive().max(1000), lengthCm: z.number().positive().max(500), widthCm: z.number().positive().max(500), heightCm: z.number().positive().max(500) });
export const deliveryStatuses = ["booked", "rider_assigned", "travelling_to_pickup", "picked_up", "in_transit", "approaching", "provider_delivered"] as const;
export interface ProviderCapabilities { quotes: boolean; booking: boolean; cancellation: boolean; statusTracking: boolean; liveGps: boolean; eta: boolean; proofOfDelivery: boolean; webhooks: boolean; }
export interface LogisticsProvider {
  id: string; name: string; sandbox: boolean; capabilities: ProviderCapabilities;
  quote(input: { interstate: boolean; parcel: z.infer<typeof parcelSchema> }): Promise<Array<{ service: string; fee: number; estimate: string }>>;
  book(quote: Entity, idempotencyKey: string): Promise<{ reference: string }>;
  cancel(reference: string): Promise<void>;
}
const sandbox: LogisticsProvider = {
  id: "sandbox", name: "Vendraza Sandbox Courier", sandbox: true,
  capabilities: { quotes: true, booking: true, cancellation: true, statusTracking: true, liveGps: false, eta: false, proofOfDelivery: false, webhooks: false },
  async quote({ interstate }) {
    // Deliberate fixtures, never live rates. Sandbox is prohibited with live payments.
    return interstate ? [{ service: "Interstate test shipment", fee: 4500, estimate: "Test estimate: 2-4 days" }]
      : [{ service: "Standard test shipment", fee: 1200, estimate: "Test estimate: 2-5 hours" }, { service: "Express test shipment", fee: 1800, estimate: "Test estimate: 45-90 minutes" }];
  },
  async book(_quote, key) { return { reference: `SANDBOX-${key}` }; },
  async cancel() {},
};
export function logisticsMode() {
  return config.LOGISTICS_MODE ?? (config.NODE_ENV === "production" ? "disabled" : "sandbox");
}
export function providers() { return logisticsMode() === "sandbox" ? [sandbox] : []; }
export function requireSandbox() {
  if (logisticsMode() !== "sandbox") throw new ApiError(503, "Delivery integrations are not configured yet.");
  if (config.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")) throw new ApiError(409, "Sandbox delivery cannot be used with live payments.");
}
export function destinationFingerprint(address: unknown) {
  const parsed = destinationSchema.parse(address);
  return createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
}
export function itemsFingerprint(items: Array<{ productId: string; quantity: number }>) {
  return createHash("sha256").update(JSON.stringify(items.map(({ productId, quantity }) => ({ productId, quantity })).sort((a, b) => a.productId.localeCompare(b.productId)))).digest("hex");
}
export async function validateQuote(db: Database, quoteId: string, customerId: string, storeId: string, address: unknown, items: Array<{ productId: string; quantity: number }>) {
  requireSandbox();
  const quote = await db.get<Entity>("logistics", quoteId);
  if (!quote || quote.kind !== "delivery_quote" || quote.customerId !== customerId || quote.storeId !== storeId) throw new ApiError(400, "Delivery quotation does not belong to this shipment.");
  if (Date.parse(String(quote.expiresAt)) <= Date.now()) throw new ApiError(409, "Delivery quotation expired. Request new delivery options.");
  if (quote.addressFingerprint !== destinationFingerprint(address) || quote.itemsFingerprint !== itemsFingerprint(items)) throw new ApiError(409, "Address or cart changed. Request new delivery options.");
  if (quote.orderId) throw new ApiError(409, "Delivery quotation has already been used.");
  return quote;
}

// In-process serialization for sandbox requests. Live adapters require durable database locks/outbox.
const bookingLocks = new WeakMap<Database, Map<string, Promise<Entity | null>>>();
export async function bookOrderDelivery(db: Database, order: Entity): Promise<Entity | null> {
  if (!order.deliveryQuoteId) return null;
  let locks = bookingLocks.get(db);
  if (!locks) { locks = new Map(); bookingLocks.set(db, locks); }
  const current = locks.get(order.id);
  if (current) return current;
  const work = book(db, order).finally(() => locks!.delete(order.id));
  locks.set(order.id, work);
  return work;
}
async function book(db: Database, order: Entity) {
  const shipmentId = `delivery-${order.id}`;
  const existing = await db.get<Entity>("logistics", shipmentId);
  if (existing && existing.status !== "booking_failed") return existing;
  requireSandbox();
  const latest = await db.get<Entity>("orders", order.id);
  if (!latest || latest.paymentStatus !== "paid" || ["cancelled", "refunded", "refund_processing", "disputed"].includes(String(latest.status))) throw new ApiError(409, "A verified, active order is required before delivery booking.");
  const quote = await db.get<Entity>("logistics", String(order.deliveryQuoteId));
  if (!quote || quote.orderId !== order.id) throw new ApiError(409, "Delivery quotation is not linked to this order.");
  const base = { id: shipmentId, kind: "delivery_booking", orderId: order.id, customerId: order.customerId, storeId: order.storeId, providerId: quote.providerId, providerName: sandbox.name, sandbox: true, destination: order.deliveryAddress, pickup: quote.pickup, fee: quote.fee, currency: "NGN", capabilities: sandbox.capabilities, createdAt: existing?.createdAt ?? now() };
  try {
    if (Date.parse(String(quote.expiresAt)) <= Date.now()) throw new ApiError(409, "Delivery quotation expired before payment. Administrator review is required; no new fee has been charged.");
    const response = await sandbox.book(quote, order.id);
    const at = now();
    const shipment = { ...base, status: "booked", reference: response.reference, events: [{ id: id("event"), status: "booked", at, source: "sandbox" }], updatedAt: at };
    const saved = existing ? await db.update<Entity>("logistics", shipmentId, shipment) : await db.create("logistics", shipment);
    const store = await db.get<Entity>("stores", String(order.storeId));
    for (const userId of [order.customerId, store?.ownerId].filter(Boolean)) await notifyOnce(db, { dedupeKey: `sandbox-delivery-booked:${order.id}:${userId}`, userId, type: "delivery_update", title: "Sandbox delivery booked", body: `Test shipment for ${order.orderNumber}. No real courier has been requested.`, href: userId === order.customerId ? `/orders/${order.id}/tracking` : "/vendor/delivery" });
    return saved;
  } catch (error) {
    const failed = { ...base, status: "booking_failed", failureReason: error instanceof Error ? error.message : "Booking failed", updatedAt: now(), events: [] };
    if (existing) await db.update("logistics", shipmentId, failed); else await db.create("logistics", failed);
    await db.create("logistics", { id: id("logistics-log"), kind: "logistics_log", orderId: order.id, action: "booking_failed", message: failed.failureReason, createdAt: now() });
    return failed;
  }
}
export async function tryBookPaidDelivery(db: Database, order: Entity) {
  // A courier failure must never undo a verified payment or trigger another charge.
  try { return await bookOrderDelivery(db, order); }
  catch (error) {
    await db.create("logistics", { id: id("logistics-log"), kind: "logistics_log", orderId: order.id, action: "booking_failed", message: error instanceof Error ? error.message : "Booking failed", createdAt: now() });
    return null;
  }
}
