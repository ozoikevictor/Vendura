import type { Conversation, Message, Offer } from "@/types";
import { productImages } from "./products";
import { daysAgo } from "@/utils/format";

export const offers: Offer[] = [
  {
    id: "offer-1", conversationId: "conv-1", productId: "p-aurora-5g", originalPrice: 245000, offeredPrice: 225000, counterPrice: 232000,
    status: "accepted", by: "vendor", createdAt: daysAgo(5), updatedAt: daysAgo(4, 20),
  },
  {
    id: "offer-2", conversationId: "conv-3", productId: "p-vela-run", originalPrice: 38500, offeredPrice: 33000,
    status: "pending", by: "customer", createdAt: daysAgo(0, 3), updatedAt: daysAgo(0, 3),
  },
  {
    id: "offer-3", conversationId: "conv-4", productId: "p-zenbook-14", originalPrice: 985000, offeredPrice: 900000,
    status: "rejected", by: "vendor", createdAt: daysAgo(2), updatedAt: daysAgo(1, 20),
  },
  {
    id: "offer-4", conversationId: "conv-5", productId: "p-chronos-watch", originalPrice: 145000, offeredPrice: 125000,
    status: "pending", by: "customer", createdAt: daysAgo(0, 1), updatedAt: daysAgo(0, 1),
  },
];

export const conversations: Conversation[] = [
  {
    id: "conv-1", productId: "p-aurora-5g", productName: "Aurora 5G Smartphone · 256GB · Dual SIM", productImage: productImages.phone, productPrice: 245000,
    storeId: "store-technaija", storeName: "TechNaija", customerId: "user-cust-1", customerName: "Chibuike Okafor",
    lastMessage: "Great, I've placed the order. Thank you!", lastMessageAt: daysAgo(4, 18), unreadForCustomer: 0, unreadForVendor: 0,
    activeOfferId: "offer-1", agreedPrice: 232000,
  },
  {
    id: "conv-2", productId: "p-chefline-skillet", productName: "Chefline Cast Iron Skillet · 26cm", productImage: productImages.skillet, productPrice: 28750,
    storeId: "store-homekraft", storeName: "HomeKraft", customerId: "user-cust-1", customerName: "Chibuike Okafor",
    lastMessage: "Yes, we deliver to Abuja. Express takes 1–2 days.", lastMessageAt: daysAgo(1, 5), unreadForCustomer: 1, unreadForVendor: 0,
  },
  {
    id: "conv-3", productId: "p-vela-run", productName: "Vela Cloud Run Sneakers · Cream", productImage: productImages.sneakers, productPrice: 38500,
    storeId: "store-stride", storeName: "Stride Lagos", customerId: "user-cust-1", customerName: "Chibuike Okafor",
    lastMessage: "Offer sent: ₦33,000", lastMessageAt: daysAgo(0, 3), unreadForCustomer: 0, unreadForVendor: 1, activeOfferId: "offer-2",
  },
  // Vendor-side conversations (TechNaija) from other customers
  {
    id: "conv-4", productId: "p-zenbook-14", productName: "ZenBook 14\" Ultrabook · Core i7 · 16GB · 512GB SSD", productImage: productImages.laptop, productPrice: 985000,
    storeId: "store-technaija", storeName: "TechNaija", customerId: "user-cust-2", customerName: "Amaka Eze",
    lastMessage: "Understood. I'll think about it.", lastMessageAt: daysAgo(1, 19), unreadForCustomer: 0, unreadForVendor: 0, activeOfferId: "offer-3",
  },
  {
    id: "conv-5", productId: "p-chronos-watch", productName: "Chronos Steel Automatic Watch · 40mm", productImage: productImages.watch, productPrice: 145000,
    storeId: "store-technaija", storeName: "TechNaija", customerId: "user-cust-3", customerName: "Ibrahim Musa",
    lastMessage: "Offer sent: ₦125,000", lastMessageAt: daysAgo(0, 1), unreadForCustomer: 0, unreadForVendor: 2, activeOfferId: "offer-4",
  },
  {
    id: "conv-6", productId: "p-nova-buds", productName: "Nova ANC Wireless Earbuds", productImage: productImages.earbuds, productPrice: 32500,
    storeId: "store-technaija", storeName: "TechNaija", customerId: "user-cust-4", customerName: "Funke Adeyemi",
    lastMessage: "Do you have the black one in stock?", lastMessageAt: daysAgo(0, 0), unreadForCustomer: 0, unreadForVendor: 1,
  },
  {
    id: "conv-7", productId: "p-smart-tv-43", productName: "43\" 4K Smart TV with Netflix & YouTube", productImage: productImages.tv, productPrice: 265000,
    storeId: "store-technaija", storeName: "TechNaija", customerId: "user-cust-5", customerName: "Emeka Nwosu",
    lastMessage: "Can you deliver to Enugu before Friday?", lastMessageAt: daysAgo(2, 3), unreadForCustomer: 1, unreadForVendor: 0,
  },
];

const m = (id: string, conversationId: string, senderRole: Message["senderRole"], text: string, at: string, extra: Partial<Message> = {}): Message => ({
  id, conversationId, senderId: senderRole === "customer" ? "user-cust-x" : senderRole === "vendor" ? "user-vendor-1" : "system",
  senderRole, kind: "text", text, sentAt: at, read: true, ...extra,
});

export const messages: Message[] = [
  m("msg-1", "conv-1", "customer", "Hi, is the Graphite 256GB available right now?", daysAgo(5, 2)),
  m("msg-2", "conv-1", "vendor", "Yes it is! We have 5 units sealed in stock.", daysAgo(5, 1)),
  m("msg-3", "conv-1", "customer", "Can you do ₦225,000? I'm buying today.", daysAgo(5, 0), { kind: "offer", offerId: "offer-1" }),
  m("msg-4", "conv-1", "vendor", "I can meet you at ₦232,000 including a free case.", daysAgo(4, 22), { kind: "offer", offerId: "offer-1" }),
  m("msg-5", "conv-1", "system", "Offer accepted. Agreed price: ₦232,000", daysAgo(4, 20), { kind: "system" }),
  m("msg-6", "conv-1", "customer", "Great, I've placed the order. Thank you!", daysAgo(4, 18)),

  m("msg-7", "conv-2", "customer", "Do you deliver to Abuja? How long does it take?", daysAgo(1, 6)),
  m("msg-8", "conv-2", "vendor", "Yes, we deliver to Abuja. Express takes 1–2 days.", daysAgo(1, 5), { read: false }),

  m("msg-9", "conv-3", "customer", "Is size 44 available in cream?", daysAgo(0, 4)),
  m("msg-10", "conv-3", "vendor", "Yes, we have 5 pairs in 44.", daysAgo(0, 3.5)),
  m("msg-11", "conv-3", "customer", "Offer sent: ₦33,000", daysAgo(0, 3), { kind: "offer", offerId: "offer-2", read: false }),

  m("msg-12", "conv-4", "customer", "Would you take ₦900,000 for the 16GB?", daysAgo(2, 1), { kind: "offer", offerId: "offer-3" }),
  m("msg-13", "conv-4", "vendor", "Sorry, our margin on this unit is thin. Best price is ₦960,000.", daysAgo(1, 21), { kind: "offer", offerId: "offer-3" }),
  m("msg-14", "conv-4", "customer", "Understood. I'll think about it.", daysAgo(1, 19)),

  m("msg-15", "conv-5", "customer", "Hello, is this the automatic version with sapphire glass?", daysAgo(0, 1.5), { read: false }),
  m("msg-16", "conv-5", "customer", "Offer sent: ₦125,000", daysAgo(0, 1), { kind: "offer", offerId: "offer-4", read: false }),

  m("msg-17", "conv-6", "customer", "Do you have the black one in stock?", daysAgo(0, 0.2), { read: false }),

  m("msg-18", "conv-7", "customer", "Can you deliver to Enugu before Friday?", daysAgo(2, 3)),
  m("msg-19", "conv-7", "vendor", "Yes — freight delivery to Enugu takes 3 days. Order by Tuesday.", daysAgo(2, 1)),
];
