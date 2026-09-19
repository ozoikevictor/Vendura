import type { Product, ProductQuery, Paginated, ID } from "@/types";
import { api, json } from "./api";

const queryString = (query: ProductQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== false && value !== "")
      params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
};

export const queryProducts = (query: ProductQuery = {}) =>
  api<Paginated<Product>>(`/products${queryString(query)}`);
export const getProductBySlug = (slug: string) =>
  api<Product>(`/products/slug/${encodeURIComponent(slug)}`);
export const getProductById = (id: ID) => api<Product>(`/products/${encodeURIComponent(id)}`);
export const getFeaturedProducts = (limit = 8) =>
  api<Product[]>(`/products/featured?limit=${limit}`);
export const getRelatedProducts = (product: Product, limit = 4) =>
  api<Product[]>(`/products/${encodeURIComponent(product.id)}/related?limit=${limit}`);
export async function getProductsByStore(storeId: ID, limit?: number) {
  const result = await queryProducts({ storeId, pageSize: limit ?? 100 });
  return result.items;
}
export const getVendorProducts = (_storeId: ID) => api<Product[]>("/vendor/products");
export const createVendorProduct = (_storeId: ID, input: Partial<Product>) =>
  api<Product>("/vendor/products", { method: "POST", ...json(input) });
export const updateVendorProduct = (id: ID, patch: Partial<Product>) =>
  api<Product>(`/vendor/products/${encodeURIComponent(id)}`, { method: "PATCH", ...json(patch) });
export const deleteVendorProduct = (id: ID) =>
  api<void>(`/vendor/products/${encodeURIComponent(id)}`, { method: "DELETE" });
export const duplicateVendorProduct = (id: ID) =>
  api<Product>(`/vendor/products/${encodeURIComponent(id)}/duplicate`, { method: "POST" });
