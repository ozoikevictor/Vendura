import type { ID, Order } from "@/types";
import { api, json } from "./api";

export interface PaystackInitialization {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export const initializePaystackPayment = (orderIds: ID[]) =>
  api<PaystackInitialization>("/payments/paystack/initialize", {
    method: "POST",
    ...json({ orderIds }),
  });

export const verifyPaystackPayment = (reference: string) =>
  api<{ reference: string; orders: Order[] }>(
    `/payments/paystack/verify/${encodeURIComponent(reference)}`,
  );
