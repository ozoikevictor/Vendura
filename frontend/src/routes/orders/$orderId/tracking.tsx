import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Package, Truck, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { DataLoader } from "@/components/shared/DataLoader";
import { DeliveryProtection } from "@/components/orders/DeliveryProtection";
import { DeliveryMap } from "@/components/orders/DeliveryMap";
import {
  getDeliveryTracking,
  deliveryAction,
  deliveryStatusLabel,
  subscribeDelivery,
} from "@/services/logisticsService";
import { getOrder } from "@/services/orderService";
import { getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { formatDateTime, formatNaira } from "@/utils/format";
import { noindexMeta } from "@/lib/seo";
import { ORDER_STATUS_LABEL } from "@/data/orders";

export const Route = createFileRoute("/orders/$orderId/tracking")({
  component: TrackingPage,
  head: () => ({ meta: noindexMeta("Track delivery | Vendraza", "Private delivery tracking.") }),
});
function TrackingPage() {
  const { orderId } = Route.useParams();
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const orderQuery = useQuery({
    queryKey: ["tracking-order", orderId, user?.id],
    queryFn: () => getOrder(orderId),
    enabled: !!user,
    refetchInterval: 15_000,
    retry: false,
  });
  const courierSelected = !!orderQuery.data?.deliveryQuoteId;
  useEffect(() => {
    if (!user || !courierSelected) return;
    const controller = new AbortController();
    void subscribeDelivery(orderId, controller.signal, () => {
      void cache.invalidateQueries({ queryKey: ["delivery-tracking", orderId] });
    }).catch(() => {
      /* Periodic queries keep status available when streaming disconnects. */
    });
    return () => controller.abort();
  }, [orderId, user, cache, courierSelected]);
  const tracking = useQuery({
    queryKey: ["delivery-tracking", orderId, user?.id],
    queryFn: () => getDeliveryTracking(orderId),
    enabled: !!user && courierSelected,
    refetchInterval: 10_000,
    retry: false,
  });
  async function act(action: "book" | "cancel") {
    setBusy(true);
    setActionError("");
    try {
      await deliveryAction(orderId, action);
      await cache.invalidateQueries({ queryKey: ["delivery-tracking", orderId] });
    } catch (error) {
      setActionError(getErrorMessage(error, "Unable to update delivery."));
    } finally {
      setBusy(false);
    }
  }
  const booking = tracking.data?.booking;
  const order = orderQuery.data;
  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <Link to="/customer/orders" className="text-sm font-semibold text-primary">
          Back to orders
        </Link>
        <h1 className="text-2xl font-bold">Track your delivery</h1>
        {!user ? (
          <Link to="/login" className="text-primary underline">
            Sign in to view this delivery
          </Link>
        ) : (courierSelected && tracking.isLoading) || orderQuery.isLoading ? (
          <DataLoader label="Loading delivery" />
        ) : (courierSelected && tracking.error) || orderQuery.error ? (
          <p role="alert" className="text-destructive">
            {getErrorMessage(tracking.error ?? orderQuery.error, "Unable to load this delivery.")}
          </p>
        ) : (
          <>
            {booking?.sandbox && (
              <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                Sandbox shipment. No real rider is assigned and no live GPS tracking is available.
              </p>
            )}
            <section className="border-b border-border bg-primary-soft p-5 sm:p-8">
              <MapPin className="mb-3 h-7 w-7 text-primary" />
              <h2 className="font-semibold">Delivery destination</h2>
              <p className="mt-1 text-sm">
                {order?.deliveryAddress.street}, {order?.deliveryAddress.city},{" "}
                {order?.deliveryAddress.state}
              </p>
              {order?.deliveryAddress.coordinates && (
                <DeliveryMap position={order.deliveryAddress.coordinates} />
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                No live rider location is connected. Shipping evidence records dispatch, not
                receipt.
              </p>
              {booking?.destination.coordinates && (
                <a
                  className="mt-3 inline-block text-sm font-semibold text-primary underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${booking.destination.coordinates.lat},${booking.destination.coordinates.lng}`}
                >
                  View destination on Google Maps
                </a>
              )}
            </section>
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Truck className="h-5 w-5 text-primary" />
                {booking
                  ? deliveryStatusLabel(booking.status)
                  : courierSelected
                    ? "Delivery has not been booked"
                    : order
                      ? ORDER_STATUS_LABEL[order.status]
                      : "Awaiting shipping updates"}
              </h2>
              <p className="mt-2 text-sm">
                {order?.orderNumber} ·{" "}
                {booking?.providerName ??
                  order?.shipment?.carrierName ??
                  "Vendor-arranged delivery"}
              </p>
              {!courierSelected && (
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>
                    {order?.shipment
                      ? "The seller has submitted shipping details. Updates below are saved order events, not live courier locations."
                      : "Waiting for the seller to prepare and dispatch your order."}
                  </p>
                  {order?.shipment?.trackingNumber && (
                    <p className="break-all font-medium text-foreground">
                      Courier reference: {order.shipment.trackingNumber}
                    </p>
                  )}
                  {order?.shipment?.shippingDate && (
                    <p>Shipping date: {formatDateTime(order.shipment.shippingDate)}</p>
                  )}
                  {order?.shipment?.additionalNote && <p>{order.shipment.additionalNote}</p>}
                </div>
              )}
              {booking?.failureReason && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {booking.failureReason}
                </p>
              )}
              {booking?.reference && (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Reference: {booking.reference}
                </p>
              )}
              <ol className="mt-4 space-y-4">
                {!courierSelected &&
                  (order?.timeline ?? []).map((event, index) => (
                    <li key={`${event.status}-${event.at}-${index}`} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{ORDER_STATUS_LABEL[event.status]}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                        {event.note && (
                          <p className="text-xs text-muted-foreground">{event.note}</p>
                        )}
                      </div>
                    </li>
                  ))}
                {(booking?.events ?? []).map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{deliveryStatusLabel(event.status)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                    </div>
                  </li>
                ))}
                {tracking.data?.customerConfirmedAt && (
                  <li className="text-sm font-medium text-primary">
                    Customer confirmed receipt · {formatDateTime(tracking.data.customerConfirmedAt)}
                  </li>
                )}
              </ol>
              {order?.customerId === user.id &&
                order.deliveryQuoteId &&
                tracking.data?.paymentStatus === "paid" &&
                (!booking || booking.status === "booking_failed") && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act("book")}
                    className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {busy ? "Requesting..." : "Retry delivery booking"}
                  </button>
                )}
              {order?.customerId === user.id &&
                booking &&
                ["booked", "rider_assigned", "travelling_to_pickup"].includes(booking.status) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act("cancel")}
                    className="mt-4 rounded-md border border-border px-4 py-2 text-sm"
                  >
                    Cancel sandbox delivery
                  </button>
                )}
              {actionError && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {actionError}
                </p>
              )}
              <Link to="/contact" className="mt-4 block text-sm font-semibold text-primary">
                Contact support
              </Link>
            </section>
            <details className="rounded-lg border border-border bg-card p-4">
              <summary className="cursor-pointer font-semibold">Order and delivery details</summary>
              <div className="mt-3 space-y-3">
                {order?.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Package className="h-5 w-5 shrink-0 text-primary" />
                    <p className="flex-1 text-sm">
                      {item.productName} × {item.quantity}
                    </p>
                    <span className="text-sm">{formatNaira(item.subtotal)}</span>
                  </div>
                ))}
                {booking && (
                  <>
                    <p className="text-sm">
                      Pickup: {booking.pickup.address}, {booking.pickup.city}
                    </p>
                    <p className="text-sm">Delivery fee: {formatNaira(booking.fee)}</p>
                    <p className="text-sm text-muted-foreground">
                      No proof of delivery has been supplied by this sandbox courier.
                    </p>
                  </>
                )}
              </div>
            </details>
            {order && order.customerId === user.id && (
              <DeliveryProtection
                order={order}
                onUpdated={() => {
                  void cache.invalidateQueries({ queryKey: ["tracking-order", orderId] });
                  void cache.invalidateQueries({ queryKey: ["delivery-tracking", orderId] });
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
