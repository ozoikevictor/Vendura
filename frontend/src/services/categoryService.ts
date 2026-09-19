import type { Category, Subcategory } from "@/types";
import { api } from "./api";

export const getCategories = () => api<Category[]>("/categories");
export const getCategoryBySlug = (slug: string) =>
  api<Category>(`/categories/${encodeURIComponent(slug)}`);
export const getPopularCategories = (limit = 8) =>
  api<Category[]>(`/categories?popular=true&limit=${limit}`);
export const getSubcategory = (categorySlug: string, subcategorySlug: string) =>
  api<Subcategory>(
    `/categories/${encodeURIComponent(categorySlug)}/subcategories/${encodeURIComponent(subcategorySlug)}`,
  );
