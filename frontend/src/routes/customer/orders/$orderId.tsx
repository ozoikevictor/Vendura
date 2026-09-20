import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Package, Truck, Home, XCircle, MapPin, Star } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/OrderStatusBadge";
import { EscrowPanel } from "@/components/shared/EscrowPanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrder, ORDER_STATUS_FLOW } from "@/services/orderService";
import { initializePaystackPayment } from "@/services/paymentService";
import { getErrorMessage } from "@/services/api";
import { createProductReview } from "@/services/productService";
import { ORDER_STATUS_LABEL } from "@/data/orders";
import { formatNaira, formatDate, formatDateTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Details — Vendura" },
      { name: "description", content: "Track your Vendura order." },
      { property: "og:title", content: "Order Details — Vendura" },
      { property: "og:description", content: "Track your Vendura order." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderDetailPage,
});

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  placed: <Package className="h-4 w-4" />,
  payment_confirmed: <CheckCircle2 className="h-4 w-4" />,
  processing: <Package className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  out_for_delivery: <Truck className="h-4 w-4" />,
  delivered: <Home className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const queryClient = useQueryClient();
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [reviewingProductId, setReviewingProductId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState<string[]>([]);
  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrder(orderId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-foreground">Order not found</h1>
          <Link
            to="/customer/orders"
            className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Back to orders
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const completedSteps = isCancelled
    ? (["placed", "cancelled"] as OrderStatus[])
    : ORDER_STATUS_FLOW.slice(0, ORDER_STATUS_FLOW.indexOf(order.status) + 1);

  const retryPayment = async () => {
    setPaymentLoading(true);
    setPaymentError("");
    try {
      const payment = await initializePaystackPayment([order.id]);
      window.sessionStorage.setItem("vendura-pending-payment", payment.reference);
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      setPaymentError(getErrorMessage(error, "Could not open Paystack. Please try again."));
      setPaymentLoading(false);
    }
  };

  const submitReview = async (productId: string) => {
    if (reviewComment.trim().length < 5) return toast.error("Write at least 5 characters about the product");
    setReviewSubmitting(true);
    try {
      await createProductReview(productId, { orderId: order.id, rating: reviewRating, comment: reviewComment.trim() });
      setReviewedProducts((items) => [...items, productId]);
      setReviewingProductId(null);
      setReviewComment("");
      setReviewRating(5);
      await queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
      toast.success("Your verified review is now published");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not publish your review"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/customer/orders" className="text-sm text-muted-foreground hover:text-primary">
          ← Back to orders
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed on {formatDateTime(order.placedAt)}
        </p>

        {order.paymentMethod !== "pay_on_delivery" && order.paymentStatus === "pending" && !isCancelled && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning-soft p-4">
            <p className="text-sm font-semibold text-foreground">Payment is still required</p>
            <p className="mt-1 text-xs text-muted-foreground">Complete payment securely with Paystack so the seller can process this order.</p>
            {paymentError && <p className="mt-2 text-xs text-destructive">{paymentError}</p>}
            <button type="button" onClick={retryPayment} disabled={paymentLoading} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {paymentLoading ? "Opening Paystack..." : `Pay ${formatNaira(order.total)}`}
            </button>
          </div>
        )}

        <EscrowPanel
          order={order}
          onUpdated={(updated) => queryClient.setQueryData(["order", orderId], updated)}
        />

        {/* Timeline */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Order Timeline</h2>
          <div className="mt-4">
            {(isCancelled ? (["placed", "cancelled"] as OrderStatus[]) : ORDER_STATUS_FLOW).map(
              (status, i) => {
                const isDone = completedSteps.includes(status);
                const event = order.timeline.find((e) => e.status === status);
                const isLast =
                  i === (isCancelled ? ["placed", "cancelled"] : ORDER_STATUS_FLOW).length - 1;
                return (
                  <div key={status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                          isDone
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {statusIcons[status]}
                      </div>
                      {!isLast && (
                        <div className={cn("h-8 w-0.5", isDone ? "bg-primary" : "bg-border")} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isDone ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {ORDER_STATUS_LABEL[status]}
                      </p>
                      {event && (
                        <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                      )}
                      {event?.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
                    </div>
                  </div>
                );
              },
            )}
          </div>
          {order.trackingNumber && (
            <div className="mt-2 rounded-lg bg-accent/30 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Tracking Number:{" "}
                <span className="font-medium text-foreground">{order.trackingNumber}</span>
              </p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Items</h2>
          <div className="mt-3 divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex flex-wrap gap-3 py-3">
                <img
                  src={item.productImage}
                  alt=""
                  className="h-16 w-16 rounded-lg border border-border object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {item.productName}
                  </p>
                  {item.variantLabel && (
                    <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                  {item.negotiated && (
                    <span className="text-xs font-semibold text-success">Negotiated price</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatNaira(item.subtotal)}
                </p>
                {order.status === "delivered" && !reviewedProducts.includes(item.productId) && (
                  <button type="button" onClick={() => { setReviewingProductId(reviewingProductId === item.productId ? null : item.productId); setReviewComment(""); setReviewRating(5); }} className="self-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent">
                    Review
                  </button>
                )}
                {reviewedProducts.includes(item.productId) && <span className="self-center text-xs font-semibold text-success">Reviewed</span>}
                {reviewingProductId === item.productId && (
                  <div className="basis-full space-y-3 rounded-lg border border-border bg-background p-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">Your rating</p>
                      <div className="mt-1 flex gap-1">
                        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} star rating`} onClick={() => setReviewRating(value)}><Star className={cn("h-6 w-6", value <= reviewRating ? "fill-warning text-warning" : "text-muted-foreground")} /></button>)}
                      </div>
                    </div>
                    <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={3} maxLength={1000} placeholder="How was the product?" className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => submitReview(item.productId)} disabled={reviewSubmitting} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">{reviewSubmitting ? "Publishing..." : "Publish Review"}</button>
                      <button type="button" onClick={() => setReviewingProductId(null)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Cancel</button>
                    </div>
                  </div>
                )}
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

        {/* Delivery info */}
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-primary" /> Delivery Address
          </h2>
          <div className="mt-2 text-sm text-muted-foreground">
            <p className="text-foreground">{order.deliveryAddress.fullName}</p>
            <p>{order.deliveryAddress.phone}</p>
            <p>{order.deliveryAddress.street}</p>
            <p>
              {order.deliveryAddress.city}, {order.deliveryAddress.state}
            </p>
            {order.deliveryAddress.landmark && <p>Landmark: {order.deliveryAddress.landmark}</p>}
          </div>
          {order.estimatedDelivery && (
            <p className="mt-2 text-xs text-muted-foreground">
              Estimated delivery: {formatDate(order.estimatedDelivery)}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">Method: {order.deliveryMethod}</p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
