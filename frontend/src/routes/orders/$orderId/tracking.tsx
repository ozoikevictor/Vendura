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
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void subscribeDelivery(orderId, controller.signal, () => {
      void cache.invalidateQueries({ queryKey: ["delivery-tracking", orderId] });
    }).catch(() => {
      /* Periodic queries keep status available when streaming disconnects. */
    });
    return () => controller.abort();
  }, [orderId, user, cache]);
  const tracking = useQuery({
    queryKey: ["delivery-tracking", orderId, user?.id],
    queryFn: () => getDeliveryTracking(orderId),
    enabled: !!user,
    refetchInterval: 10_000,
    retry: false,
  });
  const orderQuery = useQuery({
    queryKey: ["tracking-order", orderId, user?.id],
    queryFn: () => getOrder(orderId),
    enabled: !!user,
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
        ) : tracking.isLoading || orderQuery.isLoading ? (
          <DataLoader label="Loading delivery" />
        ) : tracking.error || orderQuery.error ? (
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
              <DeliveryMap position={booking?.destination.coordinates} />
              <p className="mt-3 text-sm text-muted-foreground">
                This courier supports status tracking only. No rider GPS location has been supplied.
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
                {booking ? deliveryStatusLabel(booking.status) : "Delivery has not been booked"}
              </h2>
              <p className="mt-2 text-sm">
                {order?.orderNumber} · {booking?.providerName ?? "No connected courier"}
              </p>
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
