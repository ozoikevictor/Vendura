import { api, json, getToken } from "./api";
export async function subscribeDelivery(
  orderId: string,
  signal: AbortSignal,
  onUpdate: () => void,
) {
  const base = (import.meta.env["VITE_API_URL"] ?? "http://localhost:4000/api").replace(/\/$/, "");
  const token = getToken();
  const response = await fetch(`${base}/logistics/orders/${encodeURIComponent(orderId)}/stream`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });
  if (!response.ok || !response.body) throw new Error("Tracking stream unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) >= 0) {
        const message = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        if (message.startsWith("data:")) onUpdate();
      }
    }
  } finally {
    reader.releaseLock();
  }
}
export interface DeliveryLocation {
  lat: number;
  lng: number;
}
export interface LogisticsAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  landmark?: string;
  instructions?: string;
  coordinates?: DeliveryLocation;
}
export interface DeliveryQuote {
  id: string;
  storeId: string;
  providerName: string;
  service: string;
  fee: number;
  estimate: string;
  expiresAt: string;
  sandbox: boolean;
  parcelSource: string;
}
export interface QuoteShipment {
  storeId: string;
  storeName: string;
  quotes: DeliveryQuote[];
}
export interface DeliveryBooking {
  id: string;
  orderId: string;
  storeId: string;
  providerName: string;
  sandbox: boolean;
  status: string;
  reference?: string;
  fee: number;
  failureReason?: string;
  packageReadyAt?: string;
  customerConfirmedAt?: string;
  destination: LogisticsAddress;
  pickup: { address: string; city: string; state: string };
  events: Array<{ id: string; status: string; at: string; source: string }>;
  capabilities: { liveGps: boolean; eta: boolean; proofOfDelivery: boolean };
}
export const getLogisticsProviders = () =>
  api<{ mode: "disabled" | "sandbox"; providers: Array<{ id: string; name: string }> }>(
    "/logistics/providers",
  );
export const requestDeliveryQuotes = (
  address: LogisticsAddress,
  items: Array<{ productId: string; quantity: number }>,
) =>
  api<{ sandbox: boolean; shipments: QuoteShipment[] }>("/logistics/quotes", {
    method: "POST",
    ...json({ address, items }),
  });
export const getDeliveryTracking = (orderId: string) =>
  api<{
    booking: DeliveryBooking | null;
    customerConfirmedAt: string | null;
    paymentStatus: string;
    status: string;
  }>(`/logistics/orders/${encodeURIComponent(orderId)}`);
export const getDeliveryBookings = () => api<DeliveryBooking[]>("/logistics/bookings");
export const deliveryAction = (orderId: string, action: "book" | "ready" | "cancel") =>
  api<DeliveryBooking>(`/logistics/orders/${encodeURIComponent(orderId)}/${action}`, {
    method: "POST",
  });
export const advanceSandboxDelivery = (orderId: string, status: string) =>
  api<DeliveryBooking>(`/logistics/orders/${encodeURIComponent(orderId)}/sandbox-event`, {
    method: "POST",
    ...json({ status, eventId: crypto.randomUUID() }),
  });
export const deliveryStatusLabel = (status: string) =>
  ({
    booked: "Courier confirmed",
    booking_failed: "Booking needs attention",
    rider_assigned: "Rider assigned",
    travelling_to_pickup: "Travelling to pickup",
    picked_up: "Package collected",
    in_transit: "In transit",
    approaching: "Approaching destination",
    provider_delivered: "Courier reports delivery",
    cancelled: "Delivery cancelled",
  })[status] ?? status.replaceAll("_", " ");
