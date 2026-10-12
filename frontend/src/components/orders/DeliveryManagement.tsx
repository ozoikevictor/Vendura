import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import {
  getDeliveryBookings,
  getLogisticsProviders,
  deliveryAction,
  advanceSandboxDelivery,
  deliveryStatusLabel,
} from "@/services/logisticsService";
import { getErrorMessage } from "@/services/api";
import { formatNaira } from "@/utils/format";
import { DataLoader } from "@/components/shared/DataLoader";

const nextStatus: Record<string, string> = {
  booked: "rider_assigned",
  rider_assigned: "travelling_to_pickup",
  travelling_to_pickup: "picked_up",
  picked_up: "in_transit",
  in_transit: "approaching",
  approaching: "provider_delivered",
};
export function DeliveryManagement({ admin = false }: { admin?: boolean }) {
  const cache = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const bookings = useQuery({
    queryKey: ["delivery-bookings", admin],
    queryFn: getDeliveryBookings,
    retry: false,
    refetchInterval: 15_000,
  });
  const providers = useQuery({ queryKey: ["logistics-providers"], queryFn: getLogisticsProviders });
  async function update(orderId: string, action: "ready" | "advance" | "book", status?: string) {
    setBusy(orderId);
    setError("");
    try {
      if (action === "advance" && status) await advanceSandboxDelivery(orderId, status);
      else if (action !== "advance") await deliveryAction(orderId, action);
      await cache.invalidateQueries({ queryKey: ["delivery-bookings"] });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update this delivery."));
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Truck className="h-5 w-5 text-primary" />
        Delivery Management
      </h2>
      {providers.data?.mode === "sandbox" && (
        <p className="rounded-lg bg-warning/10 p-3 text-sm">
          Sandbox testing only. No real pickup, rider or delivery is requested.
        </p>
      )}
      {providers.data?.mode === "disabled" && (
        <p className="text-sm text-muted-foreground">No logistics provider is connected.</p>
      )}
      {(error || bookings.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error || getErrorMessage(bookings.error, "Unable to load deliveries.")}
        </p>
      )}
      {bookings.isLoading ? (
        <DataLoader label="Loading deliveries" />
      ) : !bookings.error && !bookings.data?.length ? (
        <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
          No courier bookings yet. Bookings appear after customers select courier delivery and
          payment is verified.
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.data?.map((booking) => (
            <article key={booking.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{booking.providerName}</h3>
                <span className="text-sm font-semibold text-primary">
                  {deliveryStatusLabel(booking.status)}
                </span>
              </div>
              <p className="mt-2 break-all text-xs text-muted-foreground">
                {booking.reference ?? booking.orderId}
              </p>
              <p className="mt-2 text-sm">
                {booking.destination.city}, {booking.destination.state} · {formatNaira(booking.fee)}
              </p>
              {booking.failureReason && (
                <p className="mt-2 text-sm text-destructive">{booking.failureReason}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  to="/orders/$orderId/tracking"
                  params={{ orderId: booking.orderId }}
                  className="text-sm font-semibold text-primary"
                >
                  Track shipment
                </Link>
                {!booking.packageReadyAt &&
                  !["booking_failed", "cancelled", "provider_delivered"].includes(
                    booking.status,
                  ) && (
                    <button
                      type="button"
                      disabled={busy === booking.orderId}
                      onClick={() => void update(booking.orderId, "ready")}
                      className="min-h-11 rounded-md border border-border px-3 text-sm disabled:opacity-50"
                    >
                      Package ready
                    </button>
                  )}
                {booking.packageReadyAt && (
                  <span className="text-xs text-primary">Ready for pickup</span>
                )}
                {admin && booking.sandbox && nextStatus[booking.status] && (
                  <button
                    type="button"
                    disabled={busy === booking.orderId}
                    onClick={() =>
                      void update(booking.orderId, "advance", nextStatus[booking.status])
                    }
                    className="min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Test: {deliveryStatusLabel(nextStatus[booking.status]!)}
                  </button>
                )}
                {admin && booking.status === "booking_failed" && (
                  <button
                    type="button"
                    disabled={busy === booking.orderId}
                    onClick={() => void update(booking.orderId, "book")}
                    className="min-h-11 rounded-md border border-border px-3 text-sm"
                  >
                    Retry booking
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
