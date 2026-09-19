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
  router.patch("/store", asyncRoute(async (req: AuthRequest, res) => { const allowed = Object.fromEntries(Object.entries(req.body).filter(([key]) => ["name", "tagline", "description", "logoUrl", "bannerUrl", "categoryIds", "location", "allowNegotiation", "policies", "contact"].includes(key))); ok(res, await db.update("stores", req.user!.storeId!, allowed)); }));
  router.get("/overview", asyncRoute(async (req: AuthRequest, res) => { const products = (await db.list<Entity>("products")).filter((p) => p.storeId === req.user!.storeId); const orders = (await db.list<Entity>("orders")).filter((o) => o.storeId === req.user!.storeId); const transactions = (await db.list<Entity>("transactions")).filter((t) => t.vendorId === req.user!.id); ok(res, { totalRevenue: transactions.filter((t) => t.type === "sale" && t.status !== "reversed").reduce((s, t) => s + Number(t.amount), 0), ordersCount: orders.length, productsCount: products.length, customersCount: new Set(orders.map((o) => o.customerId)).size, pendingOrders: orders.filter((o) => ["placed", "payment_confirmed", "processing"].includes(String(o.status))).length, lowStockCount: products.filter((p) => Number(p.stock) <= Number(p.lowStockThreshold)).length, availableBalance: transactions.filter((t) => t.status === "available").reduce((s, t) => s + Number(t.amount), 0), revenueSeries: [], ordersSeries: [], topProducts: products.sort((a, b) => Number(b.soldCount) - Number(a.soldCount)).slice(0, 5).map((p) => ({ productId: p.id, name: p.name, sales: p.soldCount, revenue: Number(p.soldCount) * Number(p.price) })) }); }));
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
