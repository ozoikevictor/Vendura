import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Truck, Package, XCircle, ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVendorOrder,
  updateVendorOrderStatus,
  ORDER_STATUS_FLOW,
  requestOrderConfirmation,
} from "@/services/orderService";
import { ShippingEvidenceForm } from "@/components/orders/ShippingEvidenceForm";
import { DataLoader } from "@/components/shared/DataLoader";
import { ORDER_STATUS_LABEL } from "@/data/orders";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/OrderStatusBadge";
import { EscrowBadge } from "@/components/shared/EscrowBadge";
import { formatNaira, formatDateTime, formatDate } from "@/utils/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Details — Vendor — Vendura" },
      { name: "description", content: "Manage this order." },
      { property: "og:title", content: "Order Details — Vendura" },
      { property: "og:description", content: "Manage this order." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorOrderDetailPage,
});

function VendorOrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const [showShipping, setShowShipping] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const openedFromAI =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("from") === "vendor-ai";

  const goBack = () => {
    if (openedFromAI && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(openedFromAI ? "/vendor/ai" : "/vendor/orders");
  };

  const { data: order, isLoading } = useQuery({
    queryKey: ["vendor-order", orderId],
    queryFn: () => getVendorOrder(orderId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return <DataLoader label="Loading order details" className="min-h-72" />;
  }
  if (!order) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-foreground">Order not found</h1>
        <Link
          to="/vendor/orders"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const currentIdx = ORDER_STATUS_FLOW.indexOf(order.status as (typeof ORDER_STATUS_FLOW)[number]);
  const canConfirm = order.status === "placed";
  const canProcess = order.status === "payment_confirmed";
  const canShip = order.status === "processing";
  const canDeliver = order.status === "shipped" || order.status === "out_for_delivery";
  const canCancel = !isCancelled && order.status !== "delivered";

  async function handleAction(action: Parameters<typeof updateVendorOrderStatus>[1]) {
    setLoading(true);
    try {
      await updateVendorOrderStatus(orderId, action);
      queryClient.invalidateQueries({ queryKey: ["vendor-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Order updated");
      setShowCancel(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update order"));
    } finally {
      setLoading(false);
    }
  }

  async function requestConfirmation() {
    setLoading(true);
    try {
      const updated = await requestOrderConfirmation(orderId);
      queryClient.setQueryData(["vendor-order", orderId], updated);
      toast.success("The customer was asked to confirm or report a problem");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not request confirmation"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          aria-label={openedFromAI ? "Back to AI Business Assistant" : "Back to orders"}
          className="text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-foreground">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(order.placedAt)} · {order.customerName}
          </p>
        </div>
      </div>

      {/* Action bar */}
      {!isCancelled && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-4">
          {canConfirm && (
            <button
              onClick={() => handleAction({ type: "confirm" })}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> Confirm Order
            </button>
          )}
          {canProcess && (
            <button
              onClick={() => handleAction({ type: "start_processing" })}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Package className="h-4 w-4" /> Start Processing
            </button>
          )}
          {canShip && (
            <button
              onClick={() => setShowShipping(true)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Truck className="h-4 w-4" /> Add Shipping Evidence
            </button>
          )}
          {canDeliver && (
            <button
              onClick={requestConfirmation}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-2 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> Request Order Confirmation
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancel((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive-soft"
            >
              <XCircle className="h-4 w-4" /> Cancel
            </button>
          )}
        </div>
      )}
      {showShipping && (
        <ShippingEvidenceForm
          order={order}
          onClose={() => setShowShipping(false)}
          onSaved={(updated) => {
            queryClient.setQueryData(["vendor-order", orderId], updated);
            queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
          }}
        />
      )}

      {/* Cancel form */}
      {showCancel && (
        <div className="rounded-xl border border-destructive/30 bg-destructive-soft p-4">
          <p className="text-sm font-medium text-destructive">Cancel this order?</p>
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation"
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => cancelReason && handleAction({ type: "cancel", reason: cancelReason })}
              disabled={loading || !cancelReason}
              className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
            >
              Confirm Cancel
            </button>
            <button
              onClick={() => setShowCancel(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Escrow */}
      {order.escrow && (
        <div className="rounded-xl border border-primary/25 bg-primary-soft/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Escrow Payout
            </h2>
            <EscrowBadge status={order.escrow.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {order.escrow.status === "held" && (
              <>
                {formatNaira(order.escrow.amount)} is held by Vendura. It moves to your balance once
                the customer confirms delivery
                {order.escrow.autoReleaseAt
                  ? `, or automatically on ${formatDate(order.escrow.autoReleaseAt)}`
                  : ""}
                .
              </>
            )}
            {order.escrow.status === "released" && (
              <>{formatNaira(order.escrow.amount)} has been released to your balance.</>
            )}
            {order.escrow.status === "not_funded" && (
              <>Payment hasn't been received yet. Don't ship until it's held in escrow.</>
            )}
            {order.escrow.status === "refunded" && (
              <>This order was refunded, so no payout will be made.</>
            )}
            {order.escrow.status === "disputed" && (
              <>
                The customer opened a dispute
                {order.escrow.disputeReason ? `: "${order.escrow.disputeReason}"` : ""}. Funds stay
                held until it's resolved.
              </>
            )}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Timeline</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(isCancelled ? ["placed", "cancelled"] : ORDER_STATUS_FLOW).map((status, i) => {
            const isDone = isCancelled ? true : i <= currentIdx;
            return (
              <div
                key={status}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  isDone ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {isDone && <Check className="h-3 w-3" />}
                {ORDER_STATUS_LABEL[status as keyof typeof ORDER_STATUS_LABEL]}
              </div>
            );
          })}
        </div>
        {order.trackingNumber && (
          <p className="mt-3 text-sm text-muted-foreground">
            Tracking: <span className="font-medium text-foreground">{order.trackingNumber}</span>
          </p>
        )}
        {order.estimatedDelivery && (
          <p className="text-sm text-muted-foreground">
            Est. delivery: {formatDate(order.estimatedDelivery)}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Items</h2>
        <div className="mt-3 divide-y divide-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3 py-3">
              <img
                src={item.productImage}
                alt=""
                className="h-14 w-14 rounded-lg border border-border object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {item.productName}
                </p>
                {item.variantLabel && (
                  <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Qty {item.quantity} · {formatNaira(item.unitPrice)}
                </p>
                {item.negotiated && (
                  <span className="text-xs font-semibold text-success">Negotiated price</span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">{formatNaira(item.subtotal)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatNaira(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className="text-foreground">{formatNaira(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold text-primary">{formatNaira(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Customer & delivery */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Customer</h2>
          <div className="mt-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{order.customerName}</p>
            <p>{order.customerPhone}</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Delivery
          </h2>
          <div className="mt-2 text-sm text-muted-foreground">
            <p>{order.deliveryAddress.street}</p>
            <p>
              {order.deliveryAddress.city}, {order.deliveryAddress.state}
            </p>
            <p className="mt-1 text-xs">Method: {order.deliveryMethod}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
