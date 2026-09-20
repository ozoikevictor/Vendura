import type { Store, Product, ID } from "@/types";
import { api, json } from "./api";

export const getStores = () => api<Store[]>("/stores");
export const getStoreBySlug = (slug: string) =>
  api<Store>(`/stores/slug/${encodeURIComponent(slug)}`);
export const getStoreById = (id: ID) => api<Store>(`/stores/${encodeURIComponent(id)}`);
export const getFeaturedStores = (limit = 6) =>
  api<Store[]>(`/stores?featured=true&limit=${limit}`);
export const getVendorStore = (_vendorId: ID) => api<Store>("/vendor/store");
export const updateVendorStore = (input: Partial<Pick<Store, "name" | "tagline" | "description" | "logoUrl" | "bannerUrl" | "location" | "allowNegotiation" | "policies" | "contact">>) =>
  api<Store>("/vendor/store", { method: "PATCH", ...json(input) });
export const getStorefront = (slug: string) =>
  api<{ store: Store; products: Product[] }>(`/storefronts/${encodeURIComponent(slug)}`);
