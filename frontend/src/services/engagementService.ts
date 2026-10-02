import type { ID } from "@/types";
import { api } from "./api";

export const getWishlistIds = () => api<ID[]>("/users/me/wishlist");

export const addWishlistItem = (productId: ID) =>
  api<ID[]>(`/users/me/wishlist/${encodeURIComponent(productId)}`, { method: "POST" });

export const removeWishlistItem = (productId: ID) =>
  api<ID[]>(`/users/me/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE" });

export const clearWishlistItems = () => api<ID[]>("/users/me/wishlist", { method: "DELETE" });

export const getStoreFollow = (storeId: ID) =>
  api<{ following: boolean; followers: number }>(
    `/users/me/store-follows/${encodeURIComponent(storeId)}`,
  );

export const followStore = (storeId: ID) =>
  api<{ following: boolean; followers: number }>(
    `/users/me/store-follows/${encodeURIComponent(storeId)}`,
    { method: "POST" },
  );

export const unfollowStore = (storeId: ID) =>
  api<{ following: boolean; followers: number }>(
    `/users/me/store-follows/${encodeURIComponent(storeId)}`,
    { method: "DELETE" },
  );
