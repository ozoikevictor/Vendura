import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";
import { config } from "../config.js";

type PaystackResponse<T> = { status: boolean; message: string; data: T };
type PaystackBank = { id: number; name: string; code: string; active: boolean };
type ResolvedAccount = { account_number: string; account_name: string };
type TransferRecipient = { recipient_code: string };
type PaystackTransfer = { status: string; reference: string; transfer_code?: string };

export const vendorRoutes = (db: Database) => {
  const router = Router(); router.use(authenticate, authorize("vendor", "admin"));
  router.get("/store", asyncRoute(async (req: AuthRequest, res) => { const store = await db.get("stores", req.user!.storeId!); if (!store) throw new ApiError(404, "Store not found"); ok(res, store); }));
  router.patch("/store", asyncRoute(async (req: AuthRequest, res) => {
    const input = storeSettingsSchema.parse(req.body);
    const store = await db.get<Entity>("stores", req.user!.storeId!);
    if (!store) throw new ApiError(404, "Store not found");
    ok(res, await db.update("stores", store.id, { ...input, updatedAt: now() }));
  }));
  router.get("/overview", asyncRoute(async (req: AuthRequest, res) => {
    const [allProducts, allOrders, allTransactions] = await Promise.all([
      db.list<Entity>("products"),
      db.list<Entity>("orders"),
      db.list<Entity>("transactions")
    ]);
    const products = allProducts.filter((product) => product.storeId === req.user!.storeId);
    const orders = allOrders.filter((order) => order.storeId === req.user!.storeId);
    const transactions = allTransactions.filter((transaction) => transaction.vendorId === req.user!.id);
    const sales = transactions.filter((transaction) => transaction.type === "sale" && transaction.status !== "reversed");
    ok(res, {
      totalRevenue: sales.reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      ordersCount: orders.length,
      productsCount: products.length,
      customersCount: new Set(orders.map((order) => order.customerId)).size,
      pendingOrders: orders.filter((order) => ["placed", "payment_confirmed", "processing"].includes(String(order.status))).length,
      lowStockCount: products.filter((product) => Number(product.stock) <= Number(product.lowStockThreshold)).length,
      availableBalance: transactions.filter((transaction) => transaction.status === "available").reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      revenueSeries: monthlyRevenueSeries(sales),
      ordersSeries: weeklyOrderSeries(orders),
      topProducts: products.sort((a, b) => Number(b.soldCount) - Number(a.soldCount)).slice(0, 5).map((product) => ({ productId: product.id, name: product.name, sales: product.soldCount, revenue: Number(product.soldCount) * Number(product.price) }))
    });
  }));
  router.post("/ai/search", asyncRoute(async (req: AuthRequest, res) => {
    const { message } = z.object({ message: z.string().trim().min(1).max(1000) }).parse(req.body);
    const [store, allProducts, allOrders, allTransactions, allRequests, allPayouts] = await Promise.all([
      db.get<Entity>("stores", req.user!.storeId!),
      db.list<Entity>("products"),
      db.list<Entity>("orders"),
      db.list<Entity>("transactions"),
      db.list<Entity>("buyerRequests"),
      db.list<Entity>("payouts"),
    ]);
    if (!store) throw new ApiError(404, "Store not found");
    const products = allProducts.filter((product) => product.storeId === store.id);
    const orders = allOrders.filter((order) => order.storeId === store.id);
    const transactions = allTransactions.filter((transaction) => transaction.vendorId === req.user!.id && transaction.status !== "reversed");
    const payouts = allPayouts.filter((payout) => payout.vendorId === req.user!.id);
    const result = answerVendorAI(message, store, products, orders, transactions, allRequests, payouts);
    ok(res, result);
  }));
  router.get("/transactions", asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("transactions")).filter((t) => t.vendorId === req.user!.id))));
  router.get("/balance", asyncRoute(async (req: AuthRequest, res) => { const transactions = (await db.list<Entity>("transactions")).filter((t) => t.vendorId === req.user!.id); const active = transactions.filter((t) => t.status !== "reversed"); const totalSales = active.filter((t) => t.type === "sale").reduce((s, t) => s + Number(t.amount), 0); const deliveryFees = active.filter((t) => t.type === "delivery").reduce((s, t) => s + Number(t.amount), 0); ok(res, { available: active.filter((t) => t.status === "available").reduce((s, t) => s + Number(t.amount), 0), pending: active.filter((t) => t.status === "pending").reduce((s, t) => s + Number(t.amount), 0), customerPayments: totalSales + deliveryFees, totalSales, deliveryFees, platformFees: Math.abs(active.filter((t) => t.type === "fee").reduce((s, t) => s + Number(t.amount), 0)), totalPaid: Math.abs(active.filter((t) => t.type === "payout").reduce((s, t) => s + Number(t.amount), 0)) }); }));
  router.get("/payouts", asyncRoute(async (req: AuthRequest, res) => ok(res, (await db.list<Entity>("payouts")).filter((p) => p.vendorId === req.user!.id))));
  router.post("/payouts", asyncRoute(async (req: AuthRequest, res) => {
    const amount = z.number().positive().parse(req.body.amount);
    const bank = await db.get<Entity>("bankAccounts", req.user!.id);
    if (!bank?.verified || !bank.recipientCode) throw new ApiError(400, "Verify your bank account with Paystack before requesting a payout");
    const transactions = (await db.list<Entity>("transactions")).filter((t) => t.vendorId === req.user!.id && t.status === "available");
    const available = transactions.reduce((sum, item) => sum + Number(item.amount), 0);
    if (amount > available) throw new ApiError(409, "Payout amount is higher than your available balance");

    const reference = `vendura-${Date.now()}-${id("p").slice(-8).toLowerCase()}`;
    const requestedAt = now();
    const payout = await db.create("payouts", { id: id("payout"), vendorId: req.user!.id, amount, status: "pending", bankAccount: bank, reference, requestedAt });
    const ledgerEntry = await db.create<Entity>("transactions", { id: id("transaction"), vendorId: req.user!.id, type: "payout", amount: -amount, status: "available", reference, description: `Payout to ${bank.bankName} ending ${String(bank.accountNumber).slice(-4)}`, createdAt: requestedAt });
    try {
      const transfer = await paystackRequest<PaystackTransfer>("/transfer", {
        method: "POST",
        body: JSON.stringify({ source: "balance", amount: Math.round(amount * 100), recipient: bank.recipientCode, reference, reason: "Vendura seller payout", currency: "NGN" })
      });
      const updated = await db.update<Entity>("payouts", payout.id, { status: "processing", transferCode: transfer.transfer_code, providerStatus: transfer.status });
      created(res, updated);
    } catch (error) {
      await db.update("payouts", payout.id, { status: "failed", failedAt: now(), failureReason: error instanceof Error ? error.message : "Transfer could not be initiated" });
      await db.update("transactions", ledgerEntry.id, { status: "reversed", reversedAt: now() });
      throw error;
    }
  }));
  router.get("/bank-account", asyncRoute(async (req: AuthRequest, res) => ok(res, await db.get("bankAccounts", req.user!.id))));
  router.get("/banks", asyncRoute(async (_req, res) => {
    const banks = await paystackRequest<PaystackBank[]>("/bank?country=nigeria&currency=NGN&perPage=100");
    ok(res, banks.filter((bank) => bank.active && bank.code).map((bank) => ({ id: bank.id, name: bank.name, code: bank.code })));
  }));
  router.put("/bank-account", asyncRoute(async (req: AuthRequest, res) => {
    const input = z.object({ bankCode: z.string().min(2), accountNumber: z.string().regex(/^\d{10}$/) }).parse(req.body);
    const banks = await paystackRequest<PaystackBank[]>("/bank?country=nigeria&currency=NGN&perPage=100");
    const bank = banks.find((item) => item.active && item.code === input.bankCode);
    if (!bank) throw new ApiError(400, "Select a valid Nigerian bank");
    const resolved = await paystackRequest<ResolvedAccount>(`/bank/resolve?account_number=${encodeURIComponent(input.accountNumber)}&bank_code=${encodeURIComponent(input.bankCode)}`);
    const recipient = await paystackRequest<TransferRecipient>("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({ type: "nuban", name: resolved.account_name, account_number: resolved.account_number, bank_code: input.bankCode, currency: "NGN" })
    });
    const account = { bankName: bank.name, bankCode: input.bankCode, accountNumber: resolved.account_number, accountName: resolved.account_name, recipientCode: recipient.recipient_code, verified: true, verifiedAt: now() };
    const existing = await db.get("bankAccounts", req.user!.id);
    ok(res, existing ? await db.update("bankAccounts", req.user!.id, account) : await db.create("bankAccounts", { id: req.user!.id, ...account }));
  }));
  router.get("/subscription", asyncRoute(async (req: AuthRequest, res) => ok(res, await db.findOne("subscriptions", { vendorId: req.user!.id }))));
  router.patch("/subscription", asyncRoute(async (req: AuthRequest, res) => { const planId = z.enum(["starter", "growth", "business"]).parse(req.body.planId); const subscription = await db.findOne<Entity>("subscriptions", { vendorId: req.user!.id }); if (!subscription) throw new ApiError(404, "Subscription not found"); ok(res, await db.update("subscriptions", subscription.id, { planId })); }));
  router.get("/delivery-settings", asyncRoute(async (req: AuthRequest, res) => ok(res, await db.get("deliverySettings", req.user!.storeId!))));
  router.patch("/delivery-settings", asyncRoute(async (req: AuthRequest, res) => ok(res, await db.update("deliverySettings", req.user!.storeId!, req.body))));
  return router;
};

export const planRoutes = (db: Database) => { const router = Router(); router.get("/plans", asyncRoute(async (_req, res) => ok(res, await db.list("plans")))); return router; };

function monthlyRevenueSeries(sales: Entity[]) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const value = sales.reduce((sum, transaction) => {
      const createdAt = new Date(String(transaction.createdAt ?? ""));
      return createdAt.getFullYear() === year && createdAt.getMonth() === monthIndex
        ? sum + Number(transaction.amount)
        : sum;
    }, 0);
    return { label: month.toLocaleString("en-NG", { month: "short" }), value };
  });
}

function weeklyOrderSeries(orders: Entity[]) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + index);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const value = orders.filter((order) => {
      const placedAt = new Date(String(order.placedAt ?? ""));
      return placedAt >= dayStart && placedAt < dayEnd;
    }).length;
    return { label: dayStart.toLocaleString("en-NG", { weekday: "short" }), value };
  });
}

function answerVendorAI(message: string, store: Entity, products: Entity[], orders: Entity[], transactions: Entity[], requests: Entity[], payouts: Entity[]) {
  const query = message.toLowerCase();
  const activeProducts = products.filter((product) => product.status === "active");
  const lowStock = activeProducts
    .filter((product) => Number(product.stock) <= Number(product.lowStockThreshold ?? 0))
    .sort((a, b) => Number(a.stock) - Number(b.stock));
  const rankedOrders = [...orders].sort((a, b) => entityTime(b, "placedAt") - entityTime(a, "placedAt"));
  const pendingOrders = rankedOrders.filter((order) => ["placed", "payment_confirmed", "processing"].includes(String(order.status)));
  const outOfStock = products.filter((product) => Number(product.stock) <= 0 || product.status === "out_of_stock");
  const hiddenProducts = products.filter((product) => product.status !== "active");
  const sales = transactions.filter((transaction) => transaction.type === "sale");
  const period = /today/.test(query) ? "today" : /week/.test(query) ? "week" : /month/.test(query) ? "month" : "all";
  const periodSales = sales.filter((transaction) => isInPeriod(String(transaction.createdAt ?? ""), period));
  const revenue = periodSales.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  if (/payout|withdrawal/.test(query)) {
    const periodPayouts = payouts
      .filter((payout) => isInPeriod(String(payout.requestedAt ?? ""), period))
      .sort((a, b) => entityTime(b, "requestedAt") - entityTime(a, "requestedAt"));
    const total = periodPayouts.reduce((sum, payout) => sum + Number(payout.amount), 0);
    const label = period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "in total";
    return vendorAIResult(`You have ${periodPayouts.length} ${periodPayouts.length === 1 ? "payout" : "payouts"} ${label}, worth ${formatNaira(total)}.`, periodPayouts.slice(0, 8).map((payout) => ({ id: String(payout.id), type: "payout", title: formatNaira(Number(payout.amount)), subtitle: humanize(String(payout.status)), meta: formatBusinessDate(String(payout.requestedAt)), href: "/vendor/payouts" })), [
      { label: "Payouts", value: String(periodPayouts.length) },
      { label: "Amount", value: formatNaira(total) },
    ]);
  }

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)[!.?\s]*$/i.test(message.trim())) {
    return vendorAIResult(`Hello! I can help you understand ${store.name}'s products, orders, stock, revenue, customers, and buyer opportunities. What would you like to check?`);
  }
  if (/low.?stock|running low|restock|inventory alert/.test(query)) {
    const restock = [...new Map([...outOfStock, ...lowStock].map((product) => [product.id, product])).values()];
    return vendorAIResult(
      restock.length > 0
        ? `${restock.length} ${restock.length === 1 ? "product needs" : "products need"} restocking. ${restock.slice(0, 4).map((product) => `${product.name} has ${product.stock} left`).join("; ")}.`
        : "None of your active products are currently at or below their low-stock threshold.",
      restock.slice(0, 8).map(productAIItem),
    );
  }
  if (/out of stock|not available|unavailable|sold out|zero stock/.test(query)) {
    return vendorAIResult(outOfStock.length > 0 ? `${outOfStock.length} ${outOfStock.length === 1 ? "product is" : "products are"} currently out of stock.` : "None of your products are currently out of stock.", outOfStock.slice(0, 8).map(productAIItem));
  }
  if (/not (on|showing|listed)|missing.*(page|store)|draft|inactive|archived/.test(query)) {
    return vendorAIResult(hiddenProducts.length > 0 ? `${hiddenProducts.length} ${hiddenProducts.length === 1 ? "product is" : "products are"} not visible as active listings.` : "All of your product listings are active and visible.", hiddenProducts.slice(0, 8).map(productAIItem));
  }
  if (/best.?sell|top product|selling (the )?most|most sold/.test(query)) {
    const top = [...activeProducts].sort((a, b) => Number(b.soldCount ?? 0) - Number(a.soldCount ?? 0)).slice(0, 5);
    return vendorAIResult(
      top.length > 0 ? `${top[0].name} is currently your best-selling product with ${Number(top[0].soldCount ?? 0)} sold.` : "You do not have active products to rank yet.",
      top.map(productAIItem),
    );
  }
  if (/buyer request|opportunit|customer request/.test(query)) {
    const matches = requests
      .filter((request) => request.status === "active")
      .map((request) => ({ request, score: requestMatchScore(request, activeProducts) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return vendorAIResult(
      matches.length > 0
        ? `I found ${matches.length} active buyer ${matches.length === 1 ? "request" : "requests"} that may match your catalogue.`
        : "I could not find an active buyer request matching your current catalogue.",
      matches.map(({ request }) => ({ id: String(request.id), type: "request", title: String(request.product), subtitle: `${formatNaira(Number(request.maximumBudget))} maximum budget`, meta: String(request.deliveryLocation ?? "Location not provided"), href: "/vendor/ai/opportunities" })),
    );
  }
  if (/revenue|sales|how much.*(make|made|earn)/.test(query)) {
    const label = period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "in recorded sales";
    return vendorAIResult(`Your store has ${formatNaira(revenue)} ${label}, from ${periodSales.length} recorded ${periodSales.length === 1 ? "sale" : "sales"}.`, [], [
      { label: "Revenue", value: formatNaira(revenue) },
      { label: "Sales", value: String(periodSales.length) },
    ]);
  }
  if (/order/.test(query)) {
    const todayOrders = rankedOrders.filter((order) => isInPeriod(String(order.placedAt ?? ""), "today"));
    const wantsLatest = /latest|recent|newest|just received|order now|last order/.test(query);
    const wantsOpen = /pending|new orders?|summar/.test(query);
    const relevant = wantsLatest ? rankedOrders.slice(0, 1) : /today/.test(query) ? todayOrders : wantsOpen ? pendingOrders : rankedOrders;
    return vendorAIResult(
      relevant.length > 0
        ? wantsLatest ? `Your newest order is ${relevant[0].orderNumber} from ${relevant[0].customerName ?? "a customer"}, worth ${formatNaira(Number(relevant[0].total))}.` : `You have ${relevant.length} ${/today/.test(query) ? "today" : wantsOpen ? "open" : "total"} ${relevant.length === 1 ? "order" : "orders"}.`
        : wantsLatest ? "You do not have any orders yet." : `You do not have any ${wantsOpen ? "open " : ""}orders right now.`,
      relevant.slice(0, 8).map((order) => ({ id: String(order.id), type: "order", title: String(order.orderNumber), subtitle: `${order.customerName ?? "Customer"} · ${formatNaira(Number(order.total))}`, meta: `${humanize(String(order.status))} · ${formatBusinessDate(String(order.placedAt))}`, href: `/vendor/orders/${order.id}` })),
    );
  }
  if (/customer/.test(query)) {
    const customers = new Set(orders.map((order) => String(order.customerId)));
    return vendorAIResult(`${store.name} has received orders from ${customers.size} ${customers.size === 1 ? "customer" : "customers"}.`, [], [{ label: "Customers", value: String(customers.size) }]);
  }
  if (/how many|number of|count/.test(query) && /product|listing/.test(query)) {
    return vendorAIResult(`You have ${products.length} product listings: ${activeProducts.length} active and ${products.length - activeProducts.length} not active.`, [], [
      { label: "All products", value: String(products.length) },
      { label: "Active", value: String(activeProducts.length) },
      { label: "Low stock", value: String(lowStock.length) },
    ]);
  }
  const namedProducts = activeProducts.filter((product) => normalize(String(product.name)).split(" ").some((word) => word.length > 3 && normalize(query).includes(word)));
  if (namedProducts.length > 0) {
    return vendorAIResult(`I found ${namedProducts.length} matching ${namedProducts.length === 1 ? "product" : "products"} in your store.`, namedProducts.slice(0, 8).map(productAIItem));
  }
  return vendorAIResult("I can check your live products, low stock, orders, revenue, customers, best sellers, or matching buyer requests. Try asking about one of those areas.");
}

function vendorAIResult(response: string, items: Array<Record<string, unknown>> = [], metrics: Array<{ label: string; value: string }> = []) {
  return { response, items, metrics };
}

function productAIItem(product: Entity) {
  return { id: String(product.id), type: "product", title: String(product.name), subtitle: formatNaira(Number(product.price)), meta: `${Number(product.stock)} in stock · ${Number(product.soldCount ?? 0)} sold`, image: (product.images as string[] | undefined)?.[0], href: `/vendor/products/${product.id}` };
}

function entityTime(entity: Entity, field: string) {
  const value = new Date(String(entity[field] ?? entity.createdAt ?? "")).getTime();
  return Number.isFinite(value) ? value : 0;
}

function formatBusinessDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function requestMatchScore(request: Entity, products: Entity[]) {
  const requestWords = new Set(normalize(`${request.product ?? ""} ${request.details ?? ""}`).split(" ").filter((word) => word.length > 2));
  return products.reduce((best, product) => {
    const productWords = normalize(`${product.name} ${product.description} ${(product.tags as string[] | undefined ?? []).join(" ")}`).split(" ");
    return Math.max(best, productWords.filter((word) => requestWords.has(word)).length);
  }, 0);
}

function isInPeriod(value: string, period: "today" | "week" | "month" | "all") {
  if (period === "all") return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const current = new Date();
  if (period === "today") return date.toDateString() === current.toDateString();
  if (period === "month") return date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth();
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  return date >= weekStart && date <= current;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNaira(value: number) {
  return `₦${Math.round(value || 0).toLocaleString("en-NG")}`;
}

async function paystackRequest<T>(path: string, init: RequestInit = {}) {
  if (!config.PAYSTACK_SECRET_KEY) throw new ApiError(503, "Paystack is not configured yet");
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...init.headers }
  });
  const payload = await response.json() as PaystackResponse<T>;
  if (!response.ok || !payload.status) throw new ApiError(502, payload.message || "Paystack could not verify this bank account");
  return payload.data;
}

const storeSettingsSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  location: z.object({ city: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100) }).optional(),
  logoUrl: z.string().refine(
    (value) => value === "" || /^https?:\/\//i.test(value) || /^data:image\/(jpeg|png|webp);base64,/i.test(value),
    "Logo must be an HTTP image URL or an uploaded JPG, PNG, or WebP image"
  ).optional(),
  bannerUrl: z.string().refine(
    (value) => value === "" || /^https?:\/\//i.test(value) || /^data:image\/(jpeg|png|webp);base64,/i.test(value),
    "Banner must be an HTTP image URL or an uploaded JPG, PNG, or WebP image"
  ).optional(),
  allowNegotiation: z.boolean().optional(),
  policies: z.object({ returns: z.string().max(1000), shipping: z.string().max(1000), warranty: z.string().max(1000).optional() }).optional(),
  contact: z.object({ phone: z.string().optional(), email: z.string().email().optional(), whatsapp: z.string().optional() }).optional()
}).refine((value) => Object.keys(value).length > 0, "Provide at least one store field");
