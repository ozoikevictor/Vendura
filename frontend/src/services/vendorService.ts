import type {
  VendorOverview,
  Transaction,
  Payout,
  VendorBalance,
  BankAccount,
  Subscription,
  SubscriptionPlan,
  DeliverySettings,
  Notification,
  ID,
  NigerianBank,
} from "@/types";
import { api, json } from "./api";

export interface VendorAIResultItem {
  id: string;
  type: "product" | "order" | "request" | "payout";
  title: string;
  subtitle: string;
  meta: string;
  image?: string;
  href: string;
}

export interface VendorAIResult {
  response: string;
  items: VendorAIResultItem[];
  metrics: Array<{ label: string; value: string }>;
}

export const getVendorOverview = () => api<VendorOverview>("/vendor/overview");
export const searchVendorAI = (message: string) =>
  api<VendorAIResult>("/vendor/ai/search", { method: "POST", ...json({ message }) });
export const getTransactions = (_vendorId: ID) => api<Transaction[]>("/vendor/transactions");
export const getVendorBalance = () => api<VendorBalance>("/vendor/balance");
export const getPayouts = (_vendorId: ID) => api<Payout[]>("/vendor/payouts");
export const requestPayout = (amount: number, _bankAccount: BankAccount) =>
  api<Payout>("/vendor/payouts", { method: "POST", ...json({ amount }) });
export const getBankAccount = () => api<BankAccount | null>("/vendor/bank-account");
export const getNigerianBanks = () => api<NigerianBank[]>("/vendor/banks");
export const updateBankAccount = (input: { bankCode: string; accountNumber: string }) =>
  api<BankAccount>("/vendor/bank-account", { method: "PUT", ...json(input) });
export const getSubscription = () => api<Subscription>("/vendor/subscription");
export const getPlans = () => api<SubscriptionPlan[]>("/plans");
export const initializeSubscriptionPayment = (planId: SubscriptionPlan["id"]) =>
  api<{ authorizationUrl: string; accessCode: string; reference: string }>("/vendor/subscription/paystack/initialize", { method: "POST", ...json({ planId }) });
export const verifySubscriptionPayment = (reference: string) =>
  api<Subscription>(`/vendor/subscription/paystack/verify/${encodeURIComponent(reference)}`);
export const getDeliverySettings = () => api<DeliverySettings>("/vendor/delivery-settings");
export const updateDeliverySettings = (input: Partial<DeliverySettings>) =>
  api<DeliverySettings>("/vendor/delivery-settings", { method: "PATCH", ...json(input) });
export const getVendorNotifications = (_vendorId: ID) => api<Notification[]>("/notifications");
