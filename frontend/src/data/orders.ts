import type { Escrow, EscrowStatus, Order, OrderItem, OrderStatus } from "@/types";
import { productImages } from "./products";
import { mockAddresses } from "./users";
import { daysAgo, daysFromNow } from "@/utils/format";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "placed",
  "payment_confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const timelineUpTo = (status: OrderStatus, startDaysAgo: number) => {
  const idx = ORDER_STATUS_FLOW.indexOf(status);
  const steps = status === "cancelled" ? ["placed" as OrderStatus] : ORDER_STATUS_FLOW.slice(0, idx + 1);
  const events = steps.map((s, i) => ({ status: s, at: daysAgo(startDaysAgo, -i * 9) }));
  if (status === "cancelled") events.push({ status: "cancelled", at: daysAgo(startDaysAgo, -12) });
  return events;
};

const addr = mockAddresses[0]!;

export const orders: Order[] = [
  {
    id: "ord-1", orderNumber: "VND-240917-8821", customerId: "user-cust-1", customerName: "Chibuike Okafor", customerPhone: "+234 812 345 6789",
    storeId: "store-technaija", storeName: "TechNaija",
    items: [
      { id: "oi-1", productId: "p-aurora-5g", productName: "Aurora 5G Smartphone · 256GB · Dual SIM", productImage: productImages.phone, variantLabel: "Graphite / 256GB", quantity: 1, unitPrice: 232000, negotiated: true, subtotal: 232000 },
      { id: "oi-2", productId: "p-nova-buds", productName: "Nova ANC Wireless Earbuds", productImage: productImages.earbuds, variantLabel: "White", quantity: 1, unitPrice: 32500, subtotal: 32500 },
    ],
    subtotal: 264500, deliveryFee: 2500, total: 267000, status: "out_for_delivery", paymentStatus: "paid", paymentMethod: "card",
    deliveryAddress: addr, deliveryMethod: "Standard delivery", trackingNumber: "TRK-LAG-55621",
    timeline: timelineUpTo("out_for_delivery", 4), placedAt: daysAgo(4), estimatedDelivery: daysFromNow(0),
  },
  {
    id: "ord-2", orderNumber: "VND-240912-7710", customerId: "user-cust-1", customerName: "Chibuike Okafor", customerPhone: "+234 812 345 6789",
    storeId: "store-stride", storeName: "Stride Lagos",
    items: [{ id: "oi-3", productId: "p-vela-run", productName: "Vela Cloud Run Sneakers · Cream", productImage: productImages.sneakers, variantLabel: "Size 43", quantity: 1, unitPrice: 38500, subtotal: 38500 }],
    subtotal: 38500, deliveryFee: 2500, total: 41000, status: "delivered", paymentStatus: "paid", paymentMethod: "bank_transfer",
    deliveryAddress: addr, deliveryMethod: "Standard delivery", trackingNumber: "TRK-LAG-55102",
    timeline: timelineUpTo("delivered", 9), placedAt: daysAgo(9), estimatedDelivery: daysAgo(5),
  },
  {
    id: "ord-3", orderNumber: "VND-240916-9034", customerId: "user-cust-1", customerName: "Chibuike Okafor", customerPhone: "+234 812 345 6789",
    storeId: "store-homekraft", storeName: "HomeKraft",
    items: [{ id: "oi-4", productId: "p-chefline-skillet", productName: "Chefline Cast Iron Skillet · 26cm", productImage: productImages.skillet, variantLabel: "26cm", quantity: 2, unitPrice: 28750, subtotal: 57500 }],
    subtotal: 57500, deliveryFee: 5000, total: 62500, status: "processing", paymentStatus: "paid", paymentMethod: "card",
    deliveryAddress: mockAddresses[1]!, deliveryMethod: "Express delivery",
    timeline: timelineUpTo("processing", 1), placedAt: daysAgo(1), estimatedDelivery: daysFromNow(2),
  },
  {
    id: "ord-4", orderNumber: "VND-240830-4412", customerId: "user-cust-1", customerName: "Chibuike Okafor", customerPhone: "+234 812 345 6789",
    storeId: "store-essence", storeName: "Essence Co.",
    items: [{ id: "oi-5", productId: "p-zaria-noir", productName: "Zaria Noir Eau de Parfum · 100ml", productImage: productImages.perfume, variantLabel: "100ml", quantity: 1, unitPrice: 45000, subtotal: 45000 }],
    subtotal: 45000, deliveryFee: 2500, total: 47500, status: "cancelled", paymentStatus: "refunded", paymentMethod: "card",
    deliveryAddress: addr, deliveryMethod: "Standard delivery",
    timeline: timelineUpTo("cancelled", 18), placedAt: daysAgo(18),
  },
  {
    id: "ord-5", orderNumber: "VND-240917-9102", customerId: "user-cust-1", customerName: "Chibuike Okafor", customerPhone: "+234 812 345 6789",
    storeId: "store-freshmart", storeName: "FreshMart",
    items: [{ id: "oi-6", productId: "p-basmati-10kg", productName: "Premium Long Grain Basmati Rice · 10kg", productImage: productImages.rice, variantLabel: "10kg", quantity: 1, unitPrice: 21500, subtotal: 21500 }],
    subtotal: 21500, deliveryFee: 1500, total: 23000, status: "placed", paymentStatus: "pending", paymentMethod: "pay_on_delivery",
    deliveryAddress: addr, deliveryMethod: "Same-day delivery",
    timeline: timelineUpTo("placed", 0), placedAt: daysAgo(0, 2), estimatedDelivery: daysFromNow(0),
  },
];

/* Orders received by the mock vendor (TechNaija) from various customers. */
const customers = [
  ["user-cust-1", "Chibuike Okafor", "+234 812 345 6789"],
  ["user-cust-2", "Amaka Eze", "+234 803 111 2222"],
  ["user-cust-3", "Ibrahim Musa", "+234 805 333 4444"],
  ["user-cust-4", "Funke Adeyemi", "+234 807 555 6666"],
  ["user-cust-5", "Emeka Nwosu", "+234 809 777 8888"],
  ["user-cust-6", "Zainab Bello", "+234 810 999 0000"],
  ["user-cust-7", "Tobi Adebayo", "+234 812 121 3434"],
  ["user-cust-8", "Ngozi Okonkwo", "+234 813 565 7878"],
] as const;

const vendorItems = [
  { productId: "p-aurora-5g", name: "Aurora 5G Smartphone · 256GB · Dual SIM", image: productImages.phone, price: 245000, variant: "Graphite / 256GB" },
  { productId: "p-nova-buds", name: "Nova ANC Wireless Earbuds", image: productImages.earbuds, price: 32500, variant: "Black" },
  { productId: "p-zenbook-14", name: "ZenBook 14\" Ultrabook · Core i7", image: productImages.laptop, price: 985000, variant: "16GB" },
  { productId: "p-smart-tv-43", name: "43\" 4K Smart TV", image: productImages.tv, price: 265000 },
  { productId: "p-chronos-watch", name: "Chronos Steel Automatic Watch · 40mm", image: productImages.watch, price: 145000 },
];

const statuses: OrderStatus[] = ["placed", "payment_confirmed", "processing", "shipped", "out_for_delivery", "delivered", "delivered", "cancelled", "delivered", "processing", "payment_confirmed", "delivered"];

export const vendorOrders: Order[] = statuses.map((status, i) => {
  const c = customers[i % customers.length]!;
  const it = vendorItems[i % vendorItems.length]!;
  const qty = i % 4 === 0 ? 2 : 1;
  const negotiated = i % 5 === 0;
  const unit = negotiated ? Math.round(it.price * 0.94) : it.price;
  const subtotal = unit * qty;
  const fee = 2500;
  const item: OrderItem = {
    id: `voi-${i + 1}`, productId: it.productId, productName: it.name, productImage: it.image,
    quantity: qty, unitPrice: unit, negotiated, subtotal,
  };
  if (it.variant) item.variantLabel = it.variant;
  const order: Order = {
    id: `vord-${i + 1}`,
    orderNumber: `VND-2409${String(17 - i).padStart(2, "0")}-${1000 + i * 137}`,
    customerId: c[0], customerName: c[1], customerPhone: c[2],
    storeId: "store-technaija", storeName: "TechNaija",
    items: [item],
    subtotal, deliveryFee: fee, total: subtotal + fee, status,
    paymentStatus: status === "placed" ? "pending" : status === "cancelled" ? "refunded" : "paid",
    paymentMethod: i % 3 === 0 ? "bank_transfer" : "card",
    deliveryAddress: { ...addr, fullName: c[1], phone: c[2], city: ["Ikeja", "Lekki", "Wuse", "Enugu", "Kano"][i % 5]!, state: ["Lagos", "Lagos", "FCT", "Enugu", "Kano"][i % 5]! },
    deliveryMethod: i % 2 === 0 ? "Standard delivery" : "Express delivery",
    timeline: timelineUpTo(status, i),
    placedAt: daysAgo(i, i * 3),
    estimatedDelivery: daysFromNow(Math.max(0, 3 - i)),
  };
  if (["shipped", "out_for_delivery", "delivered"].includes(status)) {
    order.trackingNumber = `TRK-LAG-${55000 + i * 31}`;
  }
  return order;
});

/* ----------------------- Escrow (buyer protection) -----------------------
 * Mock only. In production the backend owns escrow state: it funds the hold
 * on payment confirmation, releases to the vendor on buyer confirmation or
 * auto-release, and freezes funds while a dispute is open.
 * ------------------------------------------------------------------------ */

export const ESCROW_STATUS_LABEL: Record<EscrowStatus, string> = {
  not_funded: "Awaiting Payment",
  held: "Payment Held Safely",
  released: "Paid Out to Seller",
  refunded: "Refunded to Buyer",
  disputed: "Dispute Under Review",
};

/** Hours the buyer has to confirm delivery before funds auto-release. */
export const ESCROW_AUTO_RELEASE_HOURS = 72;

function buildEscrow(order: Order): Escrow {
  if (order.paymentStatus === "refunded" || order.status === "cancelled") {
    return { status: "refunded", amount: order.total, fundedAt: order.placedAt, releasedAt: daysAgo(0, 6) };
  }
  if (order.paymentStatus !== "paid") {
    return { status: "not_funded", amount: order.total };
  }
  if (order.status === "delivered") {
    const deliveredAt = order.timeline.find((e) => e.status === "delivered")?.at ?? order.placedAt;
    const hoursSince = (Date.now() - new Date(deliveredAt).getTime()) / 3_600_000;
    if (hoursSince > ESCROW_AUTO_RELEASE_HOURS) {
      return { status: "released", amount: order.total, fundedAt: order.placedAt, releasedAt: deliveredAt };
    }
    const auto = new Date(new Date(deliveredAt).getTime() + ESCROW_AUTO_RELEASE_HOURS * 3_600_000);
    return { status: "held", amount: order.total, fundedAt: order.placedAt, autoReleaseAt: auto.toISOString() };
  }
  return { status: "held", amount: order.total, fundedAt: order.placedAt };
}

for (const order of [...orders, ...vendorOrders]) {
  order.escrow = buildEscrow(order);
}
