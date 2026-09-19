import type { Notification } from "@/types";
import { daysAgo } from "@/utils/format";

export const vendorNotifications: Notification[] = [
  { id: "n-1", userId: "user-vendor-1", type: "new_offer", title: "New offer on Chronos Steel Watch", body: "Ibrahim Musa offered ₦125,000 (list ₦145,000).", href: "/vendor/messages/conv-5", read: false, createdAt: daysAgo(0, 1) },
  { id: "n-2", userId: "user-vendor-1", type: "new_message", title: "New message from Funke Adeyemi", body: "“Do you have the black one in stock?”", href: "/vendor/messages/conv-6", read: false, createdAt: daysAgo(0, 0.2) },
  { id: "n-3", userId: "user-vendor-1", type: "new_order", title: "New order VND-240917-1000", body: "Chibuike Okafor ordered Aurora 5G Smartphone ×1.", href: "/vendor/orders/vord-1", read: false, createdAt: daysAgo(0, 4) },
  { id: "n-4", userId: "user-vendor-1", type: "low_stock", title: "Low stock: ZenBook 14\" Ultrabook", body: "Only 4 units left. Threshold is 5.", href: "/vendor/inventory", read: false, createdAt: daysAgo(0, 8) },
  { id: "n-5", userId: "user-vendor-1", type: "payment_received", title: "Payment received", body: "₦985,000 for order VND-240915-1274 has been confirmed.", href: "/vendor/orders/vord-3", read: true, createdAt: daysAgo(2) },
  { id: "n-6", userId: "user-vendor-1", type: "payout_processed", title: "Payout processed", body: "₦850,000 sent to GTBank ••••6789.", href: "/vendor/payouts", read: true, createdAt: daysAgo(4) },
  { id: "n-7", userId: "user-vendor-1", type: "offer_accepted", title: "Offer accepted", body: "Chibuike Okafor accepted your counter of ₦232,000.", href: "/vendor/messages/conv-1", read: true, createdAt: daysAgo(4, 20) },
  { id: "n-8", userId: "user-vendor-1", type: "order_cancelled", title: "Order cancelled", body: "Order VND-240910-1959 was cancelled and refunded.", href: "/vendor/orders/vord-8", read: true, createdAt: daysAgo(6) },
];

export const customerNotifications: Notification[] = [
  { id: "cn-1", userId: "user-cust-1", type: "order_shipped", title: "Your order is out for delivery", body: "VND-240917-8821 from TechNaija arrives today.", href: "/orders/ord-1", read: false, createdAt: daysAgo(0, 3) },
  { id: "cn-2", userId: "user-cust-1", type: "new_message", title: "HomeKraft replied", body: "“Yes, we deliver to Abuja. Express takes 1–2 days.”", href: "/messages/conv-2", read: false, createdAt: daysAgo(1, 5) },
  { id: "cn-3", userId: "user-cust-1", type: "offer_accepted", title: "Offer accepted", body: "TechNaija agreed to ₦232,000 for Aurora 5G.", href: "/messages/conv-1", read: true, createdAt: daysAgo(4, 20) },
  { id: "cn-4", userId: "user-cust-1", type: "order_delivered", title: "Order delivered", body: "VND-240912-7710 from Stride Lagos was delivered.", href: "/orders/ord-2", read: true, createdAt: daysAgo(5) },
];
