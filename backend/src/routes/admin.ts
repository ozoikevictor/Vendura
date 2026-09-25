import { Router } from "express";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { releaseEarnings, reverseEarnings } from "../lib/finance.js";
import { config } from "../config.js";
import { ORDER_STATUS, transitionOrder } from "../lib/order-protection.js";
import { id, now, ok, publicUser } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export const adminRoutes = (db: Database) => {
  const router = Router();
  router.use(authenticate, authorize("admin"));

  router.get(
    "/overview",
    asyncRoute(async (_req, res) => {
      const [users, stores, products, orders, payouts, transactions] =
        await Promise.all([
          db.list<Entity>("users"),
          db.list<Entity>("stores"),
          db.list<Entity>("products"),
          db.list<Entity>("orders"),
          db.list<Entity>("payouts"),
          db.list<Entity>("transactions"),
        ]);
      const paidOrders = orders.filter(
        (order) => order.paymentStatus === "paid",
      );
      const platformFees = transactions
        .filter(
          (transaction) =>
            transaction.type === "fee" && transaction.status !== "reversed",
        )
        .reduce(
          (sum, transaction) => sum + Math.abs(Number(transaction.amount)),
          0,
        );
      ok(res, {
        users: users.length,
        customers: users.filter((user) => user.role === "customer").length,
        vendors: users.filter((user) => user.role === "vendor").length,
        stores: stores.length,
        verifiedStores: stores.filter((store) => store.verified).length,
        products: products.length,
        activeProducts: products.filter(
          (product) => product.status === "active",
        ).length,
        orders: orders.length,
        paidOrders: paidOrders.length,
        grossSales: paidOrders.reduce(
          (sum, order) => sum + Number(order.total),
          0,
        ),
        platformFees,
        pendingPayouts: payouts.filter((payout) =>
          ["pending", "processing"].includes(String(payout.status)),
        ).length,
        pendingPayoutAmount: payouts
          .filter((payout) =>
            ["pending", "processing"].includes(String(payout.status)),
          )
          .reduce((sum, payout) => sum + Number(payout.amount), 0),
        openDisputes: orders.filter(
          (order) =>
            (order.escrow as Entity | undefined)?.status === "disputed",
        ).length,
        recentOrders: orders
          .sort((a, b) => String(b.placedAt).localeCompare(String(a.placedAt)))
          .slice(0, 8),
      });
    }),
  );

  router.get(
    "/users",
    asyncRoute(async (_req, res) => {
      const users = await db.list<Entity>("users");
      ok(
        res,
        users
          .map(publicUser)
          .sort((a, b) =>
            String(b.createdAt).localeCompare(String(a.createdAt)),
          ),
      );
    }),
  );

  router.patch(
    "/users/:id/status",
    asyncRoute(async (req: AuthRequest, res) => {
      if (req.params.id === req.user!.id)
        throw new ApiError(400, "You cannot suspend your own admin account");
      const { status } = z
        .object({ status: z.enum(["active", "suspended"]) })
        .parse(req.body);
      const user = await db.get<Entity>("users", String(req.params.id));
      if (!user) throw new ApiError(404, "User not found");
      ok(
        res,
        publicUser(
          (await db.update<Entity>("users", user.id, {
            status,
            updatedAt: now(),
          }))!,
        ),
      );
    }),
  );

  router.get(
    "/stores",
    asyncRoute(async (_req, res) => {
      const [stores, users, products, orders] = await Promise.all([
        db.list<Entity>("stores"),
        db.list<Entity>("users"),
        db.list<Entity>("products"),
        db.list<Entity>("orders"),
      ]);
      ok(
        res,
        stores
          .map((store) => ({
            ...store,
            owner: publicUser(
              users.find((user) => user.id === store.ownerId) ?? {
                id: String(store.ownerId),
              },
            ),
            productCount: products.filter(
              (product) => product.storeId === store.id,
            ).length,
            orderCount: orders.filter((order) => order.storeId === store.id)
              .length,
            sales: orders
              .filter(
                (order) =>
                  order.storeId === store.id && order.paymentStatus === "paid",
              )
              .reduce((sum, order) => sum + Number(order.total), 0),
          }))
          .sort((a, b) =>
            String((b as Entity).joinedAt).localeCompare(
              String((a as Entity).joinedAt),
            ),
          ),
      );
    }),
  );

  router.patch(
    "/stores/:id/verification",
    asyncRoute(async (req, res) => {
      const { verified } = z.object({ verified: z.boolean() }).parse(req.body);
      const store = await db.get<Entity>("stores", String(req.params.id));
      if (!store) throw new ApiError(404, "Store not found");
      ok(
        res,
        await db.update("stores", store.id, {
          verified,
          verifiedAt: verified ? now() : null,
        }),
      );
    }),
  );

  router.get(
    "/orders",
    asyncRoute(async (_req, res) => {
      const orders = await db.list<Entity>("orders");
      ok(
        res,
        orders.sort((a, b) =>
          String(b.placedAt).localeCompare(String(a.placedAt)),
        ),
      );
    }),
  );

  router.get(
    "/payouts",
    asyncRoute(async (_req, res) => {
      const [payouts, users, stores] = await Promise.all([
        db.list<Entity>("payouts"),
        db.list<Entity>("users"),
        db.list<Entity>("stores"),
      ]);
      ok(
        res,
        payouts
          .map((payout) => {
            const vendor = users.find((user) => user.id === payout.vendorId);
            const store = stores.find(
              (candidate) => candidate.ownerId === payout.vendorId,
            );
            return {
              ...payout,
              vendorName: vendor?.fullName ?? "Vendor",
              storeName: store?.name ?? "Store",
            };
          })
          .sort((a, b) =>
            String((b as Entity).requestedAt).localeCompare(
              String((a as Entity).requestedAt),
            ),
          ),
      );
    }),
  );

  router.get(
    "/disputes",
    asyncRoute(async (_req, res) => {
      const orders = await db.list<Entity>("orders");
      for (const order of orders.filter((item) => item.status === ORDER_STATUS.AWAITING_CONFIRMATION && Date.parse(String(item.confirmationDeadline || "")) <= Date.now())) {
        await transitionOrder(db, order, ORDER_STATUS.REVIEW_REQUIRED, { id: "system", role: "system" }, "Customer confirmation deadline expired; manual review required", { payoutStatus: "manual_review" });
      }
      const disputes = await db.list<Entity>("disputes");
      ok(
        res,
        orders
          .filter(
            (order) =>
              (order.escrow as Entity | undefined)?.status === "disputed" || order.status === ORDER_STATUS.REVIEW_REQUIRED,
          )
          .map((order) => ({ ...order, dispute: disputes.find((item) => item.orderId === order.id && item.kind === "order_dispute") }))
          .sort((a, b) =>
            String(((b as Entity).escrow as Entity | undefined)?.disputeOpenedAt ?? (b as Entity).confirmationDeadline).localeCompare(
              String(((a as Entity).escrow as Entity | undefined)?.disputeOpenedAt ?? (a as Entity).confirmationDeadline),
            ),
          ),
      );
    }),
  );

  router.get(
    "/support-requests",
    asyncRoute(async (_req, res) => {
      const requests = (await db.list<Entity>("supportRequests"))
        .filter((request) => request.kind === "support_request")
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      ok(res, requests);
    }),
  );

  router.patch(
    "/support-requests/:id",
    asyncRoute(async (req, res) => {
      const { status } = z
        .object({ status: z.enum(["open", "in_progress", "resolved"]) })
        .parse(req.body);
      const request = await db.get<Entity>(
        "supportRequests",
        String(req.params.id),
      );
      if (!request || request.kind !== "support_request")
        throw new ApiError(404, "Support request not found");
      ok(
        res,
        await db.update("supportRequests", request.id, {
          status,
          updatedAt: now(),
        }),
      );
    }),
  );

  router.post(
    "/disputes/:orderId/resolve",
    asyncRoute(async (req: AuthRequest, res) => {
      const { resolution, note } = z
        .object({
          resolution: z.enum(["release_to_vendor", "refund_customer"]),
          note: z.string().trim().min(3).max(500),
        })
        .parse(req.body);
      const order = await db.get<Entity>("orders", String(req.params.orderId));
      if (!order) throw new ApiError(404, "Order not found");
      if ((order.escrow as Entity | undefined)?.status !== "disputed" && order.status !== ORDER_STATUS.REVIEW_REQUIRED)
        throw new ApiError(409, "This dispute is no longer open");
      let updated: Entity | null;
      if (resolution === "release_to_vendor") {
        if (order.paymentStatus !== "paid") throw new ApiError(409, "Only a verified paid order can be released");
        await releaseEarnings(db, order.id);
        updated = await transitionOrder(db, order, ORDER_STATUS.COMPLETED, req.user!, note, { customerConfirmedAt: order.customerConfirmedAt ?? now(), payoutStatus: "eligible", escrow: { ...(order.escrow as object), status: "released", releasedAt: now(), resolution, resolutionNote: note, resolvedBy: req.user!.id } });
      } else {
        if (!config.PAYSTACK_SECRET_KEY) throw new ApiError(503, "Paystack must be configured before a real refund can be initiated");
        if (!order.paymentReference) throw new ApiError(409, "This order does not have a Paystack transaction reference");
        const existing = await db.findOne<Entity>("refunds", { kind: "refund", orderId: order.id });
        if (existing && !["failed"].includes(String(existing.providerStatus))) throw new ApiError(409, "A refund already exists for this order");
        const response = await fetch("https://api.paystack.co/refund", { method: "POST", headers: { Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ transaction: order.paymentReference, amount: Math.round(Number(order.total) * 100), currency: "NGN", customer_note: note, merchant_note: `Vendura dispute ${order.orderNumber}` }) });
        const payload = await response.json() as { status: boolean; message: string; data?: Entity };
        if (!response.ok || !payload.status || !payload.data) throw new ApiError(502, payload.message || "Paystack could not initiate the refund");
        const refund = await db.create("refunds", { id: id("refund"), kind: "refund", orderId: order.id, transactionReference: order.paymentReference, refundReference: payload.data.refund_reference ?? payload.data.id, amount: order.total, reason: note, initiatedBy: req.user!.id, initiatedAt: now(), providerStatus: payload.data.status ?? "pending", updatedAt: now() });
        await reverseEarnings(db, order);
        updated = await transitionOrder(db, order, ORDER_STATUS.REFUND_PROCESSING, req.user!, note, { refundId: refund.id, refundStatus: "processing", payoutStatus: "frozen", escrow: { ...(order.escrow as object), status: "disputed", resolution, resolutionNote: note, resolvedBy: req.user!.id } });
      }
      const dispute = await db.findOne<Entity>("disputes", { kind: "order_dispute", orderId: order.id });
      if (dispute) await db.update("disputes", dispute.id, { status: "resolved", resolution, resolutionNote: note, resolvedAt: now(), resolvedBy: req.user!.id });
      await db.create("adminActivity", { id: id("activity"), kind: "admin_activity", adminId: req.user!.id, action: resolution, orderId: order.id, note, createdAt: now() });
      const store = await db.get<Entity>("stores", String(order.storeId));
      for (const userId of [order.customerId, store?.ownerId].filter(Boolean)) {
        await db.create("notifications", {
          id: id("notification"),
          userId,
          type: "dispute_resolved",
          title: `Dispute resolved for ${order.orderNumber}`,
          body: note,
          href:
            String(userId) === String(order.customerId)
              ? `/customer/orders/${order.id}`
              : `/vendor/orders/${order.id}`,
          read: false,
          createdAt: now(),
        });
      }
      ok(res, updated);
    }),
  );

  return router;
};
