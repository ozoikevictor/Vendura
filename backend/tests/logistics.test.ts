import { beforeEach, afterEach, describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { MemoryDatabase } from "../src/db/memory.js";
import { signToken } from "../src/middleware/auth.js";
import { config } from "../src/config.js";
import { bookOrderDelivery } from "../src/lib/logistics.js";
import { recordPendingEarnings, releaseEarnings } from "../src/lib/finance.js";
import type { Entity } from "../src/types.js";

const db = new MemoryDatabase();
const app = createApp(db);
const auth = (id = "buyer", role: "customer" | "vendor" | "admin" = "customer", storeId?: string) => ({ Authorization: `Bearer ${signToken({ id, role, ...(storeId ? { storeId } : {}) })}` });
const address = { fullName: "Test Buyer", phone: "08000000000", street: "12 Example Street", city: "Ikeja", state: "Lagos", coordinates: { lat: 6.6, lng: 3.3 } };
const items = [{ productId: "item-a", quantity: 1 }];
const originalMode = config.LOGISTICS_MODE;
const originalKey = config.PAYSTACK_SECRET_KEY;
beforeEach(async () => {
  config.LOGISTICS_MODE = "sandbox";
  config.PAYSTACK_SECRET_KEY = undefined;
  await db.reset();
  await db.create("users", { id: "buyer", fullName: "Test Buyer", phone: address.phone });
  for (const suffix of ["a", "b"]) {
    await db.create("stores", { id: `store-${suffix}`, ownerId: `vendor-${suffix}`, name: `Store ${suffix}`, location: { city: "Ikeja", state: "Lagos" } });
    await db.create("products", { id: `item-${suffix}`, name: `Product ${suffix}`, storeId: `store-${suffix}`, status: "active", stock: 10, soldCount: 0, images: [], price: 1000 });
  }
});
afterEach(() => { config.LOGISTICS_MODE = originalMode; config.PAYSTACK_SECRET_KEY = originalKey; });
async function quotes(destination = address, cart = items) {
  const result = await request(app).post("/api/logistics/quotes").set(auth()).send({ address: destination, items: cart });
  expect(result.status).toBe(200);
  return result.body.data;
}
async function order() {
  const options = await quotes();
  const quote = options.shipments[0].quotes[0];
  const result = await request(app).post("/api/orders").set(auth()).send({ items, deliveryAddress: address, deliveryMethod: "provider", paymentMethod: "card", deliveryQuoteIds: { "store-a": quote.id } });
  expect(result.status).toBe(201);
  return result.body.data as Entity;
}
describe("Sandbox logistics", () => {
  it("reserves courier charges separately from seller earnings", async () => {
    const created = await order();
    await recordPendingEarnings(db, created);
    await releaseEarnings(db, created.id);
    const rows = await db.list<Entity>("transactions");
    expect(rows.find((row) => row.type === "courier_delivery_fee")).toMatchObject({ amount: 1200, status: "reserved" });
    expect(rows.some((row) => row.type === "delivery")).toBe(false);
    expect(rows.find((row) => row.type === "courier_delivery_fee")!.vendorId).toBeUndefined();
  });
  it("requires authentication and rejects invalid coordinates", async () => {
    expect((await request(app).post("/api/logistics/quotes").send({ address, items })).status).toBe(401);
    expect((await request(app).post("/api/logistics/quotes").set(auth()).send({ address: { ...address, coordinates: { lat: 100, lng: 0 } }, items })).status).toBe(400);
  });
  it("groups vendors, returns separate quotations and marks fixtures", async () => {
    const data = await quotes(address, [...items, { productId: "item-b", quantity: 1 }]);
    expect(data.shipments).toHaveLength(2);
    expect(data.shipments[0].quotes).toHaveLength(2);
    expect(data.shipments[0].quotes[0]).toMatchObject({ sandbox: true, parcelSource: "sandbox_fixture", fee: 1200 });
  });
  it("quotes interstate service without promising GPS", async () => {
    const data = await quotes({ ...address, state: "Abuja" });
    expect(data.shipments[0].quotes[0].deliveryType).toBe("interstate");
    const registry = await request(app).get("/api/logistics/providers");
    expect(registry.body.data.providers[0].capabilities.liveGps).toBe(false);
    expect(registry.body.data.providers[0].capabilities.webhooks).toBe(false);
  });
  it("rejects expired or changed quotes before mutating product stock", async () => {
    const options = await quotes();
    const quote = options.shipments[0].quotes[0];
    const input = { items, deliveryAddress: { ...address, street: "99 Different Street" }, deliveryMethod: "provider", paymentMethod: "card", deliveryQuoteIds: { "store-a": quote.id } };
    expect((await request(app).post("/api/orders").set(auth()).send(input)).status).toBe(409);
    await db.update("logistics", quote.id, { expiresAt: new Date(0).toISOString() });
    expect((await request(app).post("/api/orders").set(auth()).send({ ...input, deliveryAddress: address })).status).toBe(409);
    expect((await db.get<Entity>("products", "item-a"))!.stock).toBe(10);
  });
  it("uses server quote fees and requires online payment", async () => {
    const created = await order();
    expect(created.deliveryFee).toBe(1200);
    expect(created.total).toBe(2200);
    expect(created.deliverySandbox).toBe(true);
    expect((created.deliveryAddress as Entity).coordinates).toEqual(address.coordinates);
    expect((await request(app).post(`/api/logistics/orders/${created.id}/book`).set(auth())).status).toBe(409);
  });
  it("prevents duplicate bookings, repeated events, regressions and vendor forgery", async () => {
    const created = await order();
    const paid = (await db.update<Entity>("orders", created.id, { paymentStatus: "paid", status: "payment_confirmed" }))!;
    const [a, b] = await Promise.all([bookOrderDelivery(db, paid), bookOrderDelivery(db, paid)]);
    expect(a!.reference).toBe(b!.reference);
    expect((await db.list<Entity>("logistics")).filter((row) => row.kind === "delivery_booking")).toHaveLength(1);
    const path = `/api/logistics/orders/${created.id}/sandbox-event`;
    const event = { status: "in_transit", eventId: "event-1" };
    expect((await request(app).post(path).set(auth("vendor-a", "vendor", "store-a")).send(event)).status).toBe(403);
    expect((await request(app).post(path).set(auth("admin", "admin")).send(event)).status).toBe(200);
    const duplicate = await request(app).post(path).set(auth("admin", "admin")).send(event);
    expect(duplicate.body.data.events).toHaveLength(2);
    expect((await request(app).post(path).set(auth("admin", "admin")).send({ status: "picked_up", eventId: "old-event" })).status).toBe(409);
    await request(app).post(path).set(auth("admin", "admin")).send({ status: "provider_delivered", eventId: "event-2" });
    expect((await db.get<Entity>("orders", created.id))!.status).toBe("payment_confirmed");
    expect((await db.list("transactions"))).toHaveLength(0);
    expect((await request(app).get(`/api/logistics/orders/${created.id}`).set(auth("stranger"))).status).toBe(403);
  });
  it("records expired booking failures without charging or releasing funds", async () => {
    const created = await order();
    await db.update("logistics", String(created.deliveryQuoteId), { expiresAt: new Date(0).toISOString() });
    const paid = (await db.update<Entity>("orders", created.id, { paymentStatus: "paid" }))!;
    expect((await bookOrderDelivery(db, paid))!.status).toBe("booking_failed");
    expect((await db.list<Entity>("logistics")).some((row) => row.kind === "logistics_log")).toBe(true);
    expect(await db.list("transactions")).toHaveLength(0);
  });
  it("cancels only before collection and flags refund review", async () => {
    const created = await order();
    const paid = (await db.update<Entity>("orders", created.id, { paymentStatus: "paid" }))!;
    await bookOrderDelivery(db, paid);
    const cancelled = await request(app).post(`/api/logistics/orders/${created.id}/cancel`).set(auth());
    expect(cancelled.body.data).toMatchObject({ status: "cancelled", refundStatus: "admin_review_required" });
    expect((await request(app).post(`/api/logistics/orders/${created.id}/cancel`).set(auth())).status).toBe(200);
  });
  it("rejects live payment keys and disabled providers", async () => {
    config.PAYSTACK_SECRET_KEY = "sk_live_test_placeholder";
    expect((await request(app).post("/api/logistics/quotes").set(auth()).send({ address, items })).status).toBe(409);
    config.PAYSTACK_SECRET_KEY = undefined;
    config.LOGISTICS_MODE = "disabled";
    expect((await request(app).post("/api/logistics/quotes").set(auth()).send({ address, items })).status).toBe(503);
  });
});
