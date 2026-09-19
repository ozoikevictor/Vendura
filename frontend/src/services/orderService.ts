import type { Order, ID, DeliveryAddress, PaymentMethod } from "@/types";
import { api, json } from "./api";

export interface PlaceOrderInput {
  items: {
    productId: ID;
    variantId?: ID;
    quantity: number;
    unitPrice: number;
    negotiated?: { offerId: ID; agreedPrice: number };
  }[];
  deliveryAddress: DeliveryAddress;
  deliveryMethod: string;
  paymentMethod: PaymentMethod;
}
export type VendorOrderAction =
  | { type: "confirm" }
  | { type: "start_processing" }
  | { type: "ship"; trackingNumber: string }
  | { type: "deliver" }
  | { type: "cancel"; reason: string }
  | { type: "refund" };

export const getCustomerOrders = (_customerId: ID) => api<Order[]>("/orders");
export const getOrder = (orderId: ID) => api<Order>(`/orders/${encodeURIComponent(orderId)}`);
export const getVendorOrders = (_storeId: ID) => api<Order[]>("/vendor/orders");
export const getVendorOrder = (orderId: ID) => api<Order>(`/orders/${encodeURIComponent(orderId)}`);
export async function placeOrder(
  input: PlaceOrderInput,
): Promise<{ orderId: ID; orderNumber: string; orders: Order[] }> {
  const order = await api<Order | Order[]>("/orders", { method: "POST", ...json(input) });
  const orders = Array.isArray(order) ? order : [order];
  const first = orders[0];
  if (!first) throw new Error("No order was created");
  return { orderId: first.id, orderNumber: first.orderNumber, orders };
}
export const updateVendorOrderStatus = (orderId: ID, action: VendorOrderAction) =>
  api<Order>(`/vendor/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    ...json(action),
  });
export const confirmDeliveryAndRelease = (orderId: ID) =>
  api<Order>(`/orders/${encodeURIComponent(orderId)}/release`, { method: "POST" });
export const openEscrowDispute = (orderId: ID, reason: string) =>
  api<Order>(`/orders/${encodeURIComponent(orderId)}/disputes`, {
    method: "POST",
    ...json({ reason }),
  });
export const ORDER_STATUS_FLOW = [
  "placed",
  "payment_confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;
