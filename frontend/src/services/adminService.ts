import type { BankAccount, Order, Payout, Store, Transaction, User } from "@/types";
import { api, json } from "./api";

export interface AdminOverview {
  users: number;
  customers: number;
  vendors: number;
  stores: number;
  verifiedStores: number;
  products: number;
  activeProducts: number;
  orders: number;
  paidOrders: number;
  grossSales: number;
  platformFees: number;
  pendingPayouts: number;
  pendingPayoutAmount: number;
  openDisputes: number;
  recentOrders: Order[];
}

export interface AdminUser extends User {
  status?: "active" | "suspended";
  previousRole?: "customer" | "vendor";
}
export interface AdminStore extends Store {
  owner: AdminUser;
  orderCount: number;
  sales: number;
}
export interface AdminPayout extends Payout {
  vendorName: string;
  storeName: string;
}
export interface AdminFinance {
  summary: {
    commissions: number;
    subscriptions: number;
    processingFees: number;
    refunds: number;
    grossRevenue: number;
    withdrawn: number;
    withdrawable: number;
    sellerPending: number;
    sellerAvailable: number;
    pendingPayoutAmount: number;
  };
  ledger: (Transaction & { vendorName?: string; storeName?: string })[];
  withdrawals: Transaction[];
  bankAccount: BankAccount | null;
  recipientConfigured: boolean;
}

export const getAdminOverview = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    return await api<AdminOverview>("/admin/overview", { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The dashboard server took too long to respond. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
export const getAdminUsers = () => api<AdminUser[]>("/admin/users");
export const updateAdminUserStatus = (userId: string, status: "active" | "suspended") =>
  api<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    ...json({ status }),
  });
export const updateAdminUserRole = (userId: string, role: "customer" | "vendor" | "admin") =>
  api<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    ...json({ role }),
  });
export const deleteAdminUser = (userId: string) =>
  api<void>(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
export const getAdminStores = () => api<AdminStore[]>("/admin/stores");
export const updateStoreVerification = (storeId: string, verified: boolean) =>
  api<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}/verification`, {
    method: "PATCH",
    ...json({ verified }),
  });
export const getAdminOrders = () => api<Order[]>("/admin/orders");
export const getAdminPayouts = () => api<AdminPayout[]>("/admin/payouts");
export const updateAdminPayout = (payoutId: string, status: "paid" | "failed", note?: string) =>
  api<AdminPayout>(`/admin/payouts/${encodeURIComponent(payoutId)}`, {
    method: "PATCH",
    ...json({ status, note }),
  });
export const getAdminFinance = () => api<AdminFinance>("/admin/finance");
export const createPlatformWithdrawal = (amount: number, note: string) =>
  api<Transaction>("/admin/platform-withdrawals", { method: "POST", ...json({ amount, note }) });
export const getPlatformBank = () => api<BankAccount | null>("/admin/platform-bank");
export const updatePlatformBank = (input: { bankCode: string; accountNumber: string }) =>
  api<BankAccount>("/admin/platform-bank", { method: "PUT", ...json(input) });
export const getAdminDisputes = () => api<Order[]>("/admin/disputes");
export const resolveAdminDispute = (
  orderId: string,
  resolution: "release_to_vendor" | "refund_customer",
  note: string,
) =>
  api<Order>(`/admin/disputes/${encodeURIComponent(orderId)}/resolve`, {
    method: "POST",
    ...json({ resolution, note }),
  });

export interface SupportRequest {
  id: string; reference: string; name: string; email: string; category: string;
  subject: string; message: string; status: "open" | "in_progress" | "resolved"; createdAt: string;
}
export const getSupportRequests = () => api<SupportRequest[]>("/admin/support-requests");
export const updateSupportRequest = (id: string, status: SupportRequest["status"]) =>
  api<SupportRequest>(`/admin/support-requests/${encodeURIComponent(id)}`, { method: "PATCH", ...json({ status }) });
