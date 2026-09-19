import type { Order, Payout, Store, User } from "@/types";
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

export interface AdminUser extends User { status?: "active" | "suspended" }
export interface AdminStore extends Store { owner: AdminUser; orderCount: number; sales: number }
export interface AdminPayout extends Payout { vendorName: string; storeName: string }

export const getAdminOverview = () => api<AdminOverview>("/admin/overview");
export const getAdminUsers = () => api<AdminUser[]>("/admin/users");
export const updateAdminUserStatus = (userId: string, status: "active" | "suspended") =>
  api<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/status`, { method: "PATCH", ...json({ status }) });
export const getAdminStores = () => api<AdminStore[]>("/admin/stores");
export const updateStoreVerification = (storeId: string, verified: boolean) =>
  api<AdminStore>(`/admin/stores/${encodeURIComponent(storeId)}/verification`, { method: "PATCH", ...json({ verified }) });
export const getAdminOrders = () => api<Order[]>("/admin/orders");
export const getAdminPayouts = () => api<AdminPayout[]>("/admin/payouts");
export const getAdminDisputes = () => api<Order[]>("/admin/disputes");
export const resolveAdminDispute = (orderId: string, resolution: "release_to_vendor" | "refund_customer", note: string) =>
  api<Order>(`/admin/disputes/${encodeURIComponent(orderId)}/resolve`, { method: "POST", ...json({ resolution, note }) });
