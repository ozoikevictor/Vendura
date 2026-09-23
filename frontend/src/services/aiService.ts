import { api, json } from "./api";
import type { Product, Store } from "@/types";

export type AIProduct = Product & {
  store: Pick<Store, "id" | "name" | "slug" | "verified" | "rating" | "location"> | null;
};

export interface AISearchResult {
  response: string;
  products: AIProduct[];
  intent: "chat" | "shopping";
  filters: { terms: string[]; maximumPrice?: number };
  imageSearch: { received: boolean; fileName: string; mediaType?: string } | null;
}

export interface BuyerRequest {
  id: string;
  product: string;
  details: string;
  condition: string;
  maximumBudget: number;
  deliveryLocation: string;
  neededBy: string;
  status: "active" | "completed" | "cancelled" | "expired";
  offerCount: number;
  createdAt: string;
}

export interface AIHistoryItem {
  id: string;
  query: string;
  response: string;
  productIds: string[];
  resultCount: number;
  createdAt: string;
}

export interface AISellerOffer {
  id: string;
  conversationId: string;
  productId: string;
  productName: string;
  productImage: string;
  productSlug?: string;
  originalPrice: number;
  offeredPrice: number;
  counterPrice?: number;
  status: string;
  createdAt: string;
  store: { id: string; name: string; verified: boolean; rating: number } | null;
}

export const searchWithAI = (input: { message: string; imageName?: string; imageType?: string; sessionId?: string }) =>
  api<AISearchResult>("/ai/search", { method: "POST", ...json(input) });

export const transcribeVoice = (input: { audio: string; mediaType: string }) =>
  api<{ text: string }>("/ai/transcribe", { method: "POST", ...json(input) });

export const createBuyerRequest = (
  input: Omit<BuyerRequest, "id" | "status" | "offerCount" | "createdAt">,
) => api<BuyerRequest>("/ai/requests", { method: "POST", ...json(input) });

export const getBuyerRequests = () => api<BuyerRequest[]>("/ai/requests");
export const getAIHistory = () => api<AIHistoryItem[]>("/ai/history");
export const getAISellerOffers = () => api<AISellerOffer[]>("/ai/offers");
