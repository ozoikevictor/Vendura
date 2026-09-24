import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { MemoryDatabase } from "../src/db/memory.js";
import { seedDatabase } from "../src/db/seed.js";
import { config } from "../src/config.js";
import { createHmac } from "node:crypto";

const db = new MemoryDatabase();
const app = createApp(db);
const login = async (email: string) => (await request(app).post("/api/auth/login").send({ email, password: "Password123!" })).body.data.token as string;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => { await db.reset(); await seedDatabase(db); });

describe("Vendura API", () => {
  it("reports health", async () => { const response = await request(app).get("/health"); expect(response.status).toBe(200); expect(response.body.status).toBe("ok"); });
  it("registers, logs in, and returns the current user", async () => { const registration = await request(app).post("/api/auth/register/customer").send({ fullName: "Ada User", email: "ada@example.com", phone: "+2348012345678", password: "Password123!" }); expect(registration.status).toBe(201); const response = await request(app).get("/api/auth/me").set(auth(registration.body.data.token)); expect(response.body.data.email).toBe("ada@example.com"); expect(response.body.data.passwordHash).toBeUndefined(); });
  it("marks registrations verified and stores no OTP while verification is disabled", async () => {
    const registration = await request(app).post("/api/auth/register/customer").send({ fullName: "Secure User", email: "secure@example.com", phone: "+2348012345679", password: "Password123!" });
    const stored = await db.findOne<{ id: string; email: string; emailVerified?: boolean; verificationOtpHash?: string; verificationOtp?: string; verificationOtpExpiresAt?: string }>("users", { email: "secure@example.com" });
    expect(registration.status).toBe(201);
    expect(stored?.emailVerified).toBe(true);
    expect(stored?.verificationOtp).toBeUndefined();
    expect(stored?.verificationOtpHash).toBeUndefined();
    expect(stored?.verificationOtpExpiresAt).toBeUndefined();
    expect((await request(app).post("/api/auth/verify-email").set(auth(registration.body.data.token)).send({ otp: "000000" })).status).toBe(200);
    expect((await request(app).post("/api/auth/resend-otp").set(auth(registration.body.data.token))).status).toBe(200);
  });
  it("changes a signed-in user's password after checking the current password", async () => { const token = await login("customer@vendura.test"); expect((await request(app).post("/api/auth/change-password").set(auth(token)).send({ currentPassword: "wrong", newPassword: "NewPassword456!" })).status).toBe(400); expect((await request(app).post("/api/auth/change-password").set(auth(token)).send({ currentPassword: "Password123!", newPassword: "NewPassword456!" })).status).toBe(200); expect((await request(app).post("/api/auth/login").send({ email: "customer@vendura.test", password: "NewPassword456!" })).status).toBe(200); });
  it("rejects invalid login details", async () => { expect((await request(app).post("/api/auth/login").send({ email: "customer@vendura.test", password: "wrong" })).status).toBe(401); });
  it("lists, filters, and resolves catalog records", async () => { expect((await request(app).get("/api/categories")).body.data).toHaveLength(3); expect((await request(app).get("/api/stores/slug/technaija")).body.data.id).toBe("store-technaija"); const products = await request(app).get("/api/products?q=aurora&inStockOnly=true"); expect(products.body.data.total).toBe(1); expect((await request(app).get("/api/products/slug/aurora-5g-smartphone")).status).toBe(200); });
  it("protects vendor routes by role", async () => { const customer = await login("customer@vendura.test"); expect((await request(app).get("/api/vendor/products").set(auth(customer))).status).toBe(403); });
  it("allows a vendor to create, edit, duplicate, and delete a product", async () => { const token = await login("vendor@vendura.test"); const created = await request(app).post("/api/vendor/products").set(auth(token)).send({ name: "Test Laptop", description: "A complete test laptop", images: [], price: 500000, categoryId: "cat-electronics", sku: "TEST-1", stock: 4 }); expect(created.status).toBe(201); const productId = created.body.data.id; expect((await request(app).patch(`/api/vendor/products/${productId}`).set(auth(token)).send({ price: 480000 })).body.data.price).toBe(480000); expect((await request(app).post(`/api/vendor/products/${productId}/duplicate`).set(auth(token))).status).toBe(201); expect((await request(app).delete(`/api/vendor/products/${productId}`).set(auth(token))).status).toBe(204); });
  it("manages customer addresses", async () => { const token = await login("customer@vendura.test"); const created = await request(app).post("/api/users/me/addresses").set(auth(token)).send({ fullName: "Demo Customer", phone: "+2348000000001", street: "1 Test Street", city: "Ikeja", state: "Lagos", isDefault: true }); expect(created.status).toBe(201); expect((await request(app).get("/api/users/me/addresses").set(auth(token))).body.data).toHaveLength(1); });
  it("accepts one verified review per delivered order product and updates ratings", async () => {
    await db.create("orders", { id: "order-review-1", customerId: "user-cust-1", storeId: "store-technaija", status: "delivered", items: [{ id: "item-review-1", productId: "product-phone-1" }] });
    const customer = await login("customer@vendura.test");
    const review = await request(app).post("/api/products/product-phone-1/reviews").set(auth(customer)).send({ orderId: "order-review-1", rating: 5, comment: "Excellent phone and fast delivery." });
    expect(review.status).toBe(201);
    expect(review.body.data).toMatchObject({ rating: 5, verifiedPurchase: true, customerName: "Demo Customer" });
    expect((await request(app).get("/api/products/product-phone-1/reviews")).body.data).toHaveLength(1);
    expect((await request(app).post("/api/products/product-phone-1/reviews").set(auth(customer)).send({ orderId: "order-review-1", rating: 4, comment: "Trying to review twice." })).status).toBe(409);
    expect((await db.get<{ id: string; rating: number; reviewCount: number }>("products", "product-phone-1"))?.reviewCount).toBe(1);
    expect((await db.get<{ id: string; rating: number; reviewCount: number }>("stores", "store-technaija"))?.rating).toBe(5);
  });
  it("places an order using authoritative prices and delivery fees", async () => { const customer = await login("customer@vendura.test"); const address = { fullName: "Demo Customer", phone: "+2348000000001", street: "1 Test Street", city: "Ikeja", state: "Lagos" }; const placed = await request(app).post("/api/orders").set(auth(customer)).send({ items: [{ productId: "product-phone-1", quantity: 2, unitPrice: 1 }], deliveryAddress: address, deliveryMethod: "standard", paymentMethod: "pay_on_delivery" }); expect(placed.status).toBe(201); expect(placed.body.data).toMatchObject({ subtotal: 490000, deliveryFee: 2500, total: 492500 }); const pickup = await request(app).post("/api/orders").set(auth(customer)).send({ items: [{ productId: "product-phone-1", quantity: 1 }], deliveryAddress: address, deliveryMethod: "pickup", paymentMethod: "pay_on_delivery" }); expect(pickup.body.data).toMatchObject({ subtotal: 245000, deliveryFee: 0, total: 245000 }); const express = await request(app).post("/api/orders").set(auth(customer)).send({ items: [{ productId: "product-phone-1", quantity: 1 }], deliveryAddress: address, deliveryMethod: "express", paymentMethod: "pay_on_delivery" }); expect(express.body.data).toMatchObject({ subtotal: 245000, deliveryFee: 5000, total: 250000 }); const vendor = await login("vendor@vendura.test"); const updated = await request(app).patch(`/api/vendor/orders/${placed.body.data.id}/status`).set(auth(vendor)).send({ type: "confirm" }); expect(updated.body.data.status).toBe("payment_confirmed"); });
  it("notifies the seller about a new order and the customer about status changes", async () => {
    const customer = await login("customer@vendura.test");
    const placed = await request(app).post("/api/orders").set(auth(customer)).send({
      items: [{ productId: "product-phone-1", quantity: 1 }],
      deliveryAddress: { fullName: "Demo Customer", phone: "+2348000000001", street: "1 Test Street", city: "Ikeja", state: "Lagos" },
      deliveryMethod: "standard",
      paymentMethod: "pay_on_delivery"
    });
    const vendor = await login("vendor@vendura.test");
    const sellerNotifications = await request(app).get("/api/notifications").set(auth(vendor));
    expect(sellerNotifications.body.data).toHaveLength(1);
    expect(sellerNotifications.body.data[0]).toMatchObject({ type: "new_order", read: false, href: `/vendor/orders/${placed.body.data.id}` });

    const notificationId = sellerNotifications.body.data[0].id;
    expect((await request(app).patch(`/api/notifications/${notificationId}/read`).set(auth(vendor))).status).toBe(204);
    expect((await request(app).get("/api/notifications").set(auth(vendor))).body.data[0].read).toBe(true);

    await request(app).patch(`/api/vendor/orders/${placed.body.data.id}/status`).set(auth(vendor)).send({ type: "confirm" });
    const customerNotifications = await request(app).get("/api/notifications").set(auth(customer));
    expect(customerNotifications.body.data[0]).toMatchObject({ type: "order_confirmed", read: false, href: `/customer/orders/${placed.body.data.id}` });
    expect((await request(app).patch("/api/notifications/read-all").set(auth(customer))).status).toBe(204);
    expect((await request(app).get("/api/notifications").set(auth(customer))).body.data[0].read).toBe(true);
  });
  it("initializes and verifies a Paystack payment on the backend", async () => {
    const originalKey = config.PAYSTACK_SECRET_KEY;
    const originalFetch = globalThis.fetch;
    config.PAYSTACK_SECRET_KEY = "sk_test_abcdefghijklmnopqrstuvwxyz";
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/transaction/initialize")) {
        return new Response(JSON.stringify({ status: true, message: "Authorization URL created", data: { authorization_url: "https://checkout.paystack.com/test", access_code: "access-test", reference: "paystack-test-ref" } }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ status: true, message: "Verification successful", data: { status: "success", amount: 24750000, currency: "NGN", reference: "paystack-test-ref", paid_at: new Date().toISOString(), channel: "card" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    try {
      const customer = await login("customer@vendura.test");
      const placed = await request(app).post("/api/orders").set(auth(customer)).send({
        items: [{ productId: "product-phone-1", quantity: 1 }],
        deliveryAddress: { fullName: "Demo Customer", phone: "+2348000000001", street: "1 Test Street", city: "Ikeja", state: "Lagos" },
        deliveryMethod: "standard", paymentMethod: "card"
      });
      const initialized = await request(app).post("/api/payments/paystack/initialize").set(auth(customer)).send({ orderIds: [placed.body.data.id] });
      expect(initialized.status).toBe(200);
      expect(initialized.body.data.authorizationUrl).toBe("https://checkout.paystack.com/test");
      const stored = await db.get("orders", placed.body.data.id);
      const reference = String(stored?.paymentReference);
      const verified = await request(app).get(`/api/payments/paystack/verify/${reference}`).set(auth(customer));
      expect(verified.status).toBe(200);
      expect(verified.body.data.orders[0]).toMatchObject({ paymentStatus: "paid", status: "payment_confirmed", paymentProvider: "paystack" });
      const vendor = await login("vendor@vendura.test");
      const notifications = (await request(app).get("/api/notifications").set(auth(vendor))).body.data;
      expect(notifications.some((item: { type: string }) => item.type === "payment_received")).toBe(true);

      const pendingBalance = (await request(app).get("/api/vendor/balance").set(auth(vendor))).body.data;
      expect(pendingBalance).toMatchObject({ available: 0, pending: 235250, customerPayments: 247500, totalSales: 245000, deliveryFees: 2500, platformFees: 12250 });

      const released = await request(app).post(`/api/orders/${placed.body.data.id}/release`).set(auth(customer));
      expect(released.status).toBe(200);
      const availableBalance = (await request(app).get("/api/vendor/balance").set(auth(vendor))).body.data;
      expect(availableBalance).toMatchObject({ available: 235250, pending: 0 });

      const payout = await request(app).post("/api/vendor/payouts").set(auth(vendor)).send({ amount: 235250 });
      expect(payout.status).toBe(201);
      expect(payout.body.data).toMatchObject({ amount: 235250, status: "processing" });
      expect((await request(app).get("/api/vendor/balance").set(auth(vendor))).body.data.available).toBe(0);
      expect((await request(app).post("/api/vendor/payouts").set(auth(vendor)).send({ amount: 1 })).status).toBe(409);

      const event = { event: "transfer.success", data: { reference: payout.body.data.reference, amount: 23525000, currency: "NGN", transferred_at: new Date().toISOString() } };
      const signature = createHmac("sha512", config.PAYSTACK_SECRET_KEY!).update(JSON.stringify(event)).digest("hex");
      expect((await request(app).post("/api/webhooks/paystack").set("x-paystack-signature", signature).send(event)).status).toBe(200);
      expect((await request(app).get("/api/vendor/payouts").set(auth(vendor))).body.data[0].status).toBe("paid");
    } finally {
      config.PAYSTACK_SECRET_KEY = originalKey;
      globalThis.fetch = originalFetch;
    }
  });
  it("enforces order transitions and restores stock once when cancelled", async () => {
    const customer = await login("customer@vendura.test");
    const placed = await request(app).post("/api/orders").set(auth(customer)).send({
      items: [{ productId: "product-phone-1", quantity: 2 }],
      deliveryAddress: { fullName: "Demo Customer", phone: "+2348000000001", street: "1 Test Street", city: "Ikeja", state: "Lagos" },
      deliveryMethod: "standard",
      paymentMethod: "pay_on_delivery"
    });
    expect((await db.get("products", "product-phone-1"))?.stock).toBe(8);

    const vendor = await login("vendor@vendura.test");
    const invalid = await request(app)
      .patch(`/api/vendor/orders/${placed.body.data.id}/status`)
      .set(auth(vendor))
      .send({ type: "ship", trackingNumber: "TRACK-1" });
    expect(invalid.status).toBe(409);

    const cancelled = await request(app)
      .patch(`/api/vendor/orders/${placed.body.data.id}/status`)
      .set(auth(vendor))
      .send({ type: "cancel", reason: "Item unavailable" });
    expect(cancelled.body.data.status).toBe("cancelled");
    expect((await db.get("products", "product-phone-1"))?.stock).toBe(10);

    const repeated = await request(app)
      .patch(`/api/vendor/orders/${placed.body.data.id}/status`)
      .set(auth(vendor))
      .send({ type: "cancel", reason: "Again" });
    expect(repeated.status).toBe(409);
    expect((await db.get("products", "product-phone-1"))?.stock).toBe(10);
  });
  it("removes sold-out products from public listings and restores them after cancellation", async () => {
    await db.update("products", "product-phone-1", { stock: 1, status: "active" });
    const customer = await login("customer@vendura.test");
    const placed = await request(app).post("/api/orders").set(auth(customer)).send({
      items: [{ productId: "product-phone-1", quantity: 1 }],
      deliveryAddress: { fullName: "Demo Customer", phone: "+2348000000001", street: "1 Test Street", city: "Ikeja", state: "Lagos" },
      deliveryMethod: "standard",
      paymentMethod: "pay_on_delivery"
    });
    expect(placed.status).toBe(201);
    expect(await db.get("products", "product-phone-1")).toMatchObject({ stock: 0, status: "out_of_stock" });
    expect((await request(app).get("/api/products")).body.data.total).toBe(0);
    expect((await request(app).get("/api/storefronts/technaija")).body.data).toMatchObject({
      store: { productCount: 0 },
      products: []
    });
    const vendor = await login("vendor@vendura.test");
    expect((await request(app).get("/api/vendor/overview").set(auth(vendor))).body.data.productsCount).toBe(0);
    expect((await request(app).get("/api/vendor/products").set(auth(vendor))).body.data[0]).toMatchObject({ status: "out_of_stock", stock: 0 });

    const cancelled = await request(app)
      .patch(`/api/vendor/orders/${placed.body.data.id}/status`)
      .set(auth(vendor))
      .send({ type: "cancel", reason: "Customer changed their mind" });
    expect(cancelled.status).toBe(200);
    expect(await db.get("products", "product-phone-1")).toMatchObject({ stock: 1, status: "active" });
    expect((await request(app).get("/api/products")).body.data.total).toBe(1);
  });
  it("connects customer and vendor messages in one conversation", async () => {
    const customer = await login("customer@vendura.test");
    const vendor = await login("vendor@vendura.test");
    const conversation = await request(app).post("/api/conversations").set(auth(customer)).send({ productId: "product-phone-1" });
    expect(conversation.status).toBe(201);
    const conversationId = conversation.body.data.id;

    expect((await request(app).post(`/api/conversations/${conversationId}/messages`).set(auth(customer)).send({ text: "Is this available?" })).status).toBe(201);
    const vendorInbox = await request(app).get("/api/conversations").set(auth(vendor));
    expect(vendorInbox.body.data[0]).toMatchObject({ id: conversationId, lastMessage: "Is this available?", unreadForVendor: 1 });
    const vendorNotifications = await request(app).get("/api/notifications").set(auth(vendor));
    expect(vendorNotifications.body.data[0]).toMatchObject({
      type: "new_message",
      title: "New message from Demo Customer",
      href: `/vendor/messages/${conversationId}`,
      read: false,
    });

    expect((await request(app).post(`/api/conversations/${conversationId}/messages`).set(auth(vendor)).send({ text: "Yes, it is available." })).status).toBe(201);
    const customerInbox = await request(app).get("/api/conversations").set(auth(customer));
    expect(customerInbox.body.data[0]).toMatchObject({ id: conversationId, lastMessage: "Yes, it is available.", unreadForCustomer: 1 });
    const customerNotifications = await request(app).get("/api/notifications").set(auth(customer));
    expect(customerNotifications.body.data[0]).toMatchObject({
      type: "new_message",
      title: "New message from TechNaija",
      href: `/messages/${conversationId}`,
      read: false,
    });
    const messages = await request(app).get(`/api/conversations/${conversationId}/messages`).set(auth(customer));
    expect(messages.body.data.map((message: { text: string }) => message.text)).toEqual(["Is this available?", "Yes, it is available."]);
    expect((await request(app).post(`/api/conversations/${conversationId}/offers`).set(auth(customer)).send({ offeredPrice: 220000 })).status).toBe(201);
  });
  it("derives public store product counts from live active listings", async () => {
    await db.update("stores", "store-technaija", { productCount: 999 });
    await db.create("products", {
      id: "draft-count-test",
      storeId: "store-technaija",
      name: "Unpublished draft",
      description: "This draft should not appear publicly",
      status: "draft",
      categoryId: "cat-electronics",
      tags: [],
      images: [],
      price: 1,
      stock: 1,
      createdAt: new Date().toISOString(),
    });
    const storefront = await request(app).get("/api/storefronts/technaija");
    expect(storefront.body.data.store.productCount).toBe(storefront.body.data.products.length);
    expect(storefront.body.data.store.productCount).toBe(1);
    const stores = await request(app).get("/api/stores");
    expect(stores.body.data.find((store: { id: string }) => store.id === "store-technaija").productCount).toBe(1);
  });
  it("searches live products through the authenticated shopping assistant", async () => {
    expect((await request(app).post("/api/ai/search").send({ message: "I need a phone" })).status).toBe(401);
    const vendor = await login("vendor@vendura.test");
    expect((await request(app).post("/api/ai/search").set(auth(vendor)).send({ message: "I need a phone" })).status).toBe(403);
    const customer = await login("customer@vendura.test");
    const result = await request(app).post("/api/ai/search").set(auth(customer)).send({
      message: "I need an iPhone under ₦300,000",
      imageName: "black-smartphone.jpg",
      imageType: "image/jpeg",
    });
    expect(result.status).toBe(200);
    expect(result.body.data.products).toHaveLength(0);
    expect(result.body.data.response).toContain("will not substitute");
    expect(result.body.data.filters.maximumPrice).toBe(300000);
    expect(result.body.data.imageSearch.received).toBe(true);
    const generic = await request(app).post("/api/ai/search").set(auth(customer)).send({ message: "I need a phone under ₦300,000" });
    expect(generic.body.data.products[0]).toMatchObject({ id: "product-phone-1", name: "Aurora 5G Smartphone", price: 245000 });
    const specific = await request(app).post("/api/ai/search").set(auth(customer)).send({ message: "I need a red phone" });
    expect(specific.body.data.products).toHaveLength(0);
    const buyerRequest = await request(app).post("/api/ai/requests").set(auth(customer)).send({
      product: "Red leather bag",
      details: "Medium size with a shoulder strap",
      condition: "New",
      maximumBudget: 50000,
      deliveryLocation: "Enugu",
      neededBy: "Friday",
    });
    expect(buyerRequest.status).toBe(201);
    expect(buyerRequest.body.data).toMatchObject({ product: "Red leather bag", status: "active", offerCount: 0 });
    const requests = await request(app).get("/api/ai/requests").set(auth(customer));
    expect(requests.body.data[0]).toMatchObject({ id: buyerRequest.body.data.id, maximumBudget: 50000 });
    const history = await request(app).get("/api/ai/history").set(auth(customer));
    expect(history.body.data[0]).toMatchObject({ query: "I need a red phone", resultCount: 0 });
    const greeting = await request(app).post("/api/ai/search").set(auth(customer)).send({ message: "Hello" });
    expect(greeting.body.data).toMatchObject({ intent: "chat", products: [] });
    expect(greeting.body.data.response).toContain("shopping assistant");
    const count = await request(app).post("/api/ai/search").set(auth(customer)).send({ message: "How many products are on Vendura?" });
    expect(count.body.data).toMatchObject({ intent: "chat", products: [] });
    expect(count.body.data.response).toContain("1 active product");
    const availability = await request(app).post("/api/ai/search").set(auth(customer)).send({
      message: "Do you have phones?",
      sessionId: "catalog-chat",
    });
    expect(availability.body.data.products[0]).toMatchObject({ id: "product-phone-1" });
    expect(availability.body.data.response).toContain("Yes. I found 1 matching in-stock product");
    const bareProduct = await request(app).post("/api/ai/search").set(auth(customer)).send({ message: "phone" });
    expect(bareProduct.body.data).toMatchObject({ intent: "shopping" });
    expect(bareProduct.body.data.products[0]).toMatchObject({ id: "product-phone-1" });
    const colours = await request(app).post("/api/ai/search").set(auth(customer)).send({
      message: "What colours?",
      sessionId: "catalog-chat",
    });
    expect(colours.body.data.products[0]).toMatchObject({ id: "product-phone-1" });
    expect(colours.body.data.response).toContain("have not listed colour options yet");
    const aiOffers = await request(app).get("/api/ai/offers").set(auth(customer));
    expect(aiOffers.status).toBe(200);
    expect(Array.isArray(aiOffers.body.data)).toBe(true);
  });
  it("returns vendor dashboard, AI, settings, subscription, and finance data", async () => { const token = await login("vendor@vendura.test"); const overview = await request(app).get("/api/vendor/overview").set(auth(token)); expect(overview.status).toBe(200); expect(overview.body.data.revenueSeries).toHaveLength(7); expect(overview.body.data.ordersSeries).toHaveLength(7); const ai = await request(app).post("/api/vendor/ai/search").set(auth(token)).send({ message: "How many products do I have?" }); expect(ai.status).toBe(200); expect(ai.body.data.response).toContain("1 product listing"); expect(ai.body.data.metrics).toEqual(expect.arrayContaining([{ label: "All products", value: "1" }])); expect((await request(app).get("/api/vendor/delivery-settings").set(auth(token))).body.data.pickupAvailable).toBe(true); expect((await request(app).get("/api/vendor/subscription").set(auth(token))).body.data.planId).toBe("growth"); expect((await request(app).get("/api/plans")).body.data).toHaveLength(3); });
  it("creates a payment-due starter subscription for an existing vendor", async () => {
    await db.remove("subscriptions", "subscription-1");
    const token = await login("vendor@vendura.test");
    const response = await request(app).get("/api/vendor/subscription").set(auth(token));
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ vendorId: "user-vendor-1", planId: "starter", status: "past_due", isActive: false });
    expect(response.body.data.plan).toMatchObject({ productLimit: 20 });
  });
  it("enforces monthly subscription status and plan product limits", async () => {
    const token = await login("vendor@vendura.test");
    await db.update("subscriptions", "subscription-1", { planId: "starter", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5).toISOString() });
    for (let index = 2; index <= 20; index += 1) {
      await db.create("products", { id: `limit-product-${index}`, storeId: "store-technaija", name: `Limit product ${index}` });
    }
    const atLimit = await request(app).post("/api/vendor/products").set(auth(token)).send({ name: "One too many", description: "This product exceeds the starter limit.", images: [], price: 5000, categoryId: "cat-electronics", sku: "LIMIT-21", stock: 1 });
    expect(atLimit.status).toBe(409);
    expect(atLimit.body.error.message).toContain("20 products");

    await db.update("subscriptions", "subscription-1", { status: "active", currentPeriodEnd: new Date(Date.now() - 1000).toISOString() });
    const expired = await request(app).post("/api/vendor/products").set(auth(token)).send({ name: "Expired plan product", description: "This product requires a renewed plan.", images: [], price: 5000, categoryId: "cat-electronics", sku: "EXPIRED-1", stock: 1 });
    expect(expired.status).toBe(402);
    expect((await request(app).get("/api/vendor/subscription").set(auth(token))).body.data).toMatchObject({ status: "past_due", isActive: false });
  });
  it("activates a paid monthly subscription through Paystack", async () => {
    const originalKey = config.PAYSTACK_SECRET_KEY;
    const originalFetch = globalThis.fetch;
    config.PAYSTACK_SECRET_KEY = "sk_test_abcdefghijklmnopqrstuvwxyz";
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/transaction/initialize")) {
        return new Response(JSON.stringify({ status: true, message: "Initialized", data: { authorization_url: "https://checkout.paystack.com/subscription", access_code: "sub-access", reference: "provider-reference" } }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ status: true, message: "Verified", data: { status: "success", amount: 300000, currency: "NGN", reference: "provider-reference", paid_at: new Date().toISOString() } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    try {
      const token = await login("vendor@vendura.test");
      await db.update("subscriptions", "subscription-1", { status: "past_due", currentPeriodEnd: new Date(Date.now() - 1000).toISOString() });
      const initialized = await request(app).post("/api/vendor/subscription/paystack/initialize").set(auth(token)).send({ planId: "starter" });
      expect(initialized.status).toBe(200);
      expect(initialized.body.data.authorizationUrl).toBe("https://checkout.paystack.com/subscription");
      const reference = initialized.body.data.reference as string;
      const verified = await request(app).get(`/api/vendor/subscription/paystack/verify/${reference}`).set(auth(token));
      expect(verified.status).toBe(200);
      expect(verified.body.data).toMatchObject({ planId: "starter", status: "active", isActive: true });
      expect(new Date(verified.body.data.currentPeriodEnd).getTime()).toBeGreaterThan(new Date(verified.body.data.currentPeriodStart).getTime());
    } finally {
      config.PAYSTACK_SECRET_KEY = originalKey;
      globalThis.fetch = originalFetch;
    }
  });
  it("answers live vendor business questions and ranks newest orders first", async () => {
    const token = await login("vendor@vendura.test");
    await db.create("orders", { id: "order-old", orderNumber: "VND-OLD", storeId: "store-technaija", customerId: "customer-old", customerName: "Old Customer", total: 10000, status: "placed", placedAt: "2026-01-01T08:00:00.000Z" });
    await db.create("orders", { id: "order-new", orderNumber: "VND-NEW", storeId: "store-technaija", customerId: "customer-new", customerName: "New Customer", total: 20000, status: "placed", placedAt: "2026-09-24T08:00:00.000Z" });
    await db.update("products", "product-phone-1", { stock: 0, status: "out_of_stock" });
    await db.create("payouts", { id: "payout-ai", vendorId: "user-vendor-1", amount: 5000, status: "paid", requestedAt: new Date().toISOString() });
    const orders = await request(app).get("/api/vendor/orders").set(auth(token));
    expect(orders.body.data.map((order: { id: string }) => order.id)).toEqual(["order-new", "order-old"]);
    const latest = await request(app).post("/api/vendor/ai/search").set(auth(token)).send({ message: "What is my newest order?" });
    expect(latest.body.data.response).toContain("VND-NEW");
    expect(latest.body.data.items[0]).toMatchObject({ id: "order-new", type: "order" });
    const stock = await request(app).post("/api/vendor/ai/search").set(auth(token)).send({ message: "Which products are out of stock?" });
    expect(stock.body.data.items[0]).toMatchObject({ id: "product-phone-1", type: "product" });
    const payout = await request(app).post("/api/vendor/ai/search").set(auth(token)).send({ message: "Show my payouts for today" });
    expect(payout.body.data.metrics).toEqual(expect.arrayContaining([{ label: "Amount", value: "₦5,000" }]));
  });
  it("lists banks and verifies a seller bank account through Paystack", async () => {
    const originalKey = config.PAYSTACK_SECRET_KEY;
    const originalFetch = globalThis.fetch;
    config.PAYSTACK_SECRET_KEY = "sk_test_abcdefghijklmnopqrstuvwxyz";
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/bank?")) return new Response(JSON.stringify({ status: true, message: "Banks", data: [{ id: 1, name: "Test Bank", code: "999", active: true }] }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (url.includes("/bank/resolve")) return new Response(JSON.stringify({ status: true, message: "Resolved", data: { account_number: "0123456789", account_name: "VICTOR JAMES" } }), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ status: true, message: "Recipient created", data: { recipient_code: "RCP_test123" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    try {
      const vendor = await login("vendor@vendura.test");
      expect((await request(app).get("/api/vendor/banks").set(auth(vendor))).body.data[0]).toMatchObject({ name: "Test Bank", code: "999" });
      const saved = await request(app).put("/api/vendor/bank-account").set(auth(vendor)).send({ bankCode: "999", accountNumber: "0123456789" });
      expect(saved.status).toBe(200);
      expect(saved.body.data).toMatchObject({ bankName: "Test Bank", bankCode: "999", accountName: "VICTOR JAMES", recipientCode: "RCP_test123", verified: true });
    } finally {
      config.PAYSTACK_SECRET_KEY = originalKey;
      globalThis.fetch = originalFetch;
    }
  });
  it("rejects unsigned payout webhooks and restores a failed payout once", async () => {
    const originalKey = config.PAYSTACK_SECRET_KEY;
    config.PAYSTACK_SECRET_KEY = "sk_test_abcdefghijklmnopqrstuvwxyz";
    try {
      await db.create("transactions", { id: "payout-ledger-test", vendorId: "user-vendor-1", type: "payout", amount: -1000, status: "available", reference: "vendura-failed-transfer-123", description: "Test payout", createdAt: new Date().toISOString() });
      await db.create("payouts", { id: "payout-failed-test", vendorId: "user-vendor-1", amount: 1000, status: "processing", reference: "vendura-failed-transfer-123", requestedAt: new Date().toISOString() });
      const event = { event: "transfer.failed", data: { reference: "vendura-failed-transfer-123", amount: 100000, currency: "NGN", reason: "Bank unavailable" } };
      expect((await request(app).post("/api/webhooks/paystack").send(event)).status).toBe(401);
      const signature = createHmac("sha512", config.PAYSTACK_SECRET_KEY).update(JSON.stringify(event)).digest("hex");
      expect((await request(app).post("/api/webhooks/paystack").set("x-paystack-signature", signature).send(event)).status).toBe(200);
      expect((await db.get("payouts", "payout-failed-test"))?.status).toBe("failed");
      expect((await db.get("transactions", "payout-ledger-test"))?.status).toBe("reversed");
      const notifications = await db.list<{ id: string; type: string }>("notifications");
      expect(notifications.filter((item) => item.type === "payout_processed")).toHaveLength(1);
      expect((await request(app).post("/api/webhooks/paystack").set("x-paystack-signature", signature).send(event)).status).toBe(200);
      expect((await db.list<{ id: string; type: string }>("notifications")).filter((item) => item.type === "payout_processed")).toHaveLength(1);
    } finally { config.PAYSTACK_SECRET_KEY = originalKey; }
  });
  it("protects the admin console and lets an admin manage accounts and stores", async () => {
    const customer = await login("customer@vendura.test");
    expect((await request(app).get("/api/admin/overview").set(auth(customer))).status).toBe(403);

    const admin = await login("admin@vendura.test");
    const overview = await request(app).get("/api/admin/overview").set(auth(admin));
    expect(overview.status).toBe(200);
    expect(overview.body.data).toMatchObject({ users: 3, vendors: 1, customers: 1, stores: 1 });

    const suspended = await request(app).patch("/api/admin/users/user-cust-1/status").set(auth(admin)).send({ status: "suspended" });
    expect(suspended.body.data.status).toBe("suspended");
    expect((await request(app).post("/api/auth/login").send({ email: "customer@vendura.test", password: "Password123!" })).status).toBe(403);

    const verified = await request(app).patch("/api/admin/stores/store-technaija/verification").set(auth(admin)).send({ verified: false });
    expect(verified.body.data.verified).toBe(false);
  });
  it("returns consistent 404 errors", async () => { const response = await request(app).get("/api/no-such-route"); expect(response.status).toBe(404); expect(response.body.error.message).toBe("Endpoint not found"); });

  it("supports the complete seller storefront and customer order journey", async () => {
    const seller = await request(app).post("/api/auth/register/vendor").send({
      fullName: "Ada Nwosu",
      businessName: "Ada Fashion",
      email: "ada.vendor@example.com",
      phone: "+2348011112222",
      password: "Password123!",
      businessCategory: "cat-fashion",
      storeDescription: "Contemporary Nigerian fashion and accessories.",
      location: { city: "Lekki", state: "Lagos" }
    });
    expect(seller.status).toBe(201);
    expect(seller.body.data.storefrontPath).toBe("/store/ada-fashion");

    const sellerToken = seller.body.data.token as string;
    const sellerSubscription = await db.findOne("subscriptions", { vendorId: seller.body.data.user.id });
    expect(sellerSubscription).toBeDefined();
    await db.update("subscriptions", sellerSubscription!.id, { status: "active", currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString() });
    const product = await request(app).post("/api/vendor/products").set(auth(sellerToken)).send({
      name: "Ankara Wrap Dress",
      description: "A handmade Ankara wrap dress.",
      images: ["https://example.com/dress.jpg"],
      price: 45000,
      categoryId: "cat-fashion",
      sku: "AF-DRESS-1",
      stock: 6,
      status: "active"
    });
    expect(product.status).toBe(201);

    const storefront = await request(app).get("/api/storefronts/ada-fashion");
    expect(storefront.status).toBe(200);
    expect(storefront.body.data.store.name).toBe("Ada Fashion");
    expect(storefront.body.data.products).toHaveLength(1);

    const otherVendorToken = await login("vendor@vendura.test");
    const forbidden = await request(app)
      .patch(`/api/vendor/products/${product.body.data.id}`)
      .set(auth(otherVendorToken))
      .send({ price: 1 });
    expect(forbidden.status).toBe(403);

    const customerToken = await login("customer@vendura.test");
    const order = await request(app).post("/api/orders").set(auth(customerToken)).send({
      items: [{ productId: product.body.data.id, quantity: 1 }],
      deliveryAddress: {
        fullName: "Demo Customer",
        phone: "+2348000000001",
        street: "1 Test Street",
        city: "Ikeja",
        state: "Lagos"
      },
      deliveryMethod: "standard",
      paymentMethod: "card"
    });
    expect(order.status).toBe(201);
    expect(order.body.data.storeId).toBe(seller.body.data.store.id);

    const sellerOrders = await request(app).get("/api/vendor/orders").set(auth(sellerToken));
    expect(sellerOrders.body.data).toHaveLength(1);
    expect(sellerOrders.body.data[0].id).toBe(order.body.data.id);
  });
});
