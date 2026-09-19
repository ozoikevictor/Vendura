import type { Conversation, Message, Offer, ID, OfferStatus } from "@/types";
import { api, json } from "./api";

export const getCustomerConversations = (_customerId: ID) => api<Conversation[]>("/conversations");
export const getVendorConversations = (_storeId: ID) => api<Conversation[]>("/conversations");
export const getConversation = (id: ID) =>
  api<Conversation>(`/conversations/${encodeURIComponent(id)}`);
export const getMessages = (conversationId: ID) =>
  api<Message[]>(`/conversations/${encodeURIComponent(conversationId)}/messages`);
export const sendMessage = (
  conversationId: ID,
  _senderId: ID,
  _senderRole: "customer" | "vendor",
  text: string,
) =>
  api<Message>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    ...json({ text }),
  });
export async function getOffer(offerId: ID) {
  const conversations = await api<Conversation[]>("/conversations");
  for (const conversation of conversations) {
    const offers = await getOffersForConversation(conversation.id);
    const offer = offers.find((item) => item.id === offerId);
    if (offer) return offer;
  }
  throw new Error("Offer not found");
}
export const getOffersForConversation = (conversationId: ID) =>
  api<Offer[]>(`/conversations/${encodeURIComponent(conversationId)}/offers`);
export const makeOffer = (
  conversationId: ID,
  _productId: ID,
  _originalPrice: number,
  offeredPrice: number,
  _by: "customer" | "vendor",
) =>
  api<Offer>(`/conversations/${encodeURIComponent(conversationId)}/offers`, {
    method: "POST",
    ...json({ offeredPrice }),
  });
export const respondToOffer = (offerId: ID, status: OfferStatus, counterPrice?: number) =>
  api<Offer>(`/offers/${encodeURIComponent(offerId)}`, {
    method: "PATCH",
    ...json({ status, ...(counterPrice !== undefined ? { counterPrice } : {}) }),
  });
export const markConversationRead = (conversationId: ID, _role: "customer" | "vendor") =>
  api<void>(`/conversations/${encodeURIComponent(conversationId)}/read`, { method: "POST" });
