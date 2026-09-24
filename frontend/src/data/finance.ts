import type { Subscription, SubscriptionPlan, Transaction, Payout, VendorBalance, BankAccount, DeliverySettings, VendorOverview } from "@/types";
import { daysAgo, daysFromNow } from "@/utils/format";

export const plans: SubscriptionPlan[] = [
  {
    id: "starter", name: "Starter", priceMonthly: 3000, productLimit: 20,
    features: ["Up to 20 products", "Public storefront", "Customer chat", "Basic analytics", "Email support"],
  },
  {
    id: "growth", name: "Growing Business", priceMonthly: 7500, productLimit: 500, highlighted: true,
    features: ["Up to 500 products", "Price negotiation", "Advanced analytics", "Weekly payouts", "Priority support"],
  },
  {
    id: "business", name: "Enterprise", priceMonthly: 15000, productLimit: null,
    features: ["Unlimited products", "Team access (5 seats)", "Daily payouts", "Featured store placement", "Dedicated account manager"],
  },
];

export const currentSubscription: Subscription = {
  id: "sub-1", vendorId: "user-vendor-1", planId: "growth", status: "active",
  currentPeriodStart: daysAgo(12), currentPeriodEnd: daysFromNow(18), autoRenew: true,
};

export const bankAccount: BankAccount = {
  bankName: "Guaranty Trust Bank", accountNumber: "0123456789", accountName: "TECHNAIJA VENTURES", verified: true,
};

export const vendorBalance: VendorBalance = {
  available: 1284500, pending: 612000, totalPaid: 9860000, nextPayoutAt: daysFromNow(3),
  totalSales: 11200000, deliveryFees: 180000, customerPayments: 11380000, platformFees: 336000,
};

export const transactions: Transaction[] = [
  { id: "tx-1", vendorId: "user-vendor-1", type: "sale", amount: 264500, reference: "VND-240917-8821", description: "Order VND-240917-8821 — Aurora 5G + Nova Buds", orderId: "vord-1", createdAt: daysAgo(0, 4) },
  { id: "tx-2", vendorId: "user-vendor-1", type: "fee", amount: -7935, reference: "FEE-8821", description: "Platform fee (3%)", orderId: "vord-1", createdAt: daysAgo(0, 4) },
  { id: "tx-3", vendorId: "user-vendor-1", type: "sale", amount: 985000, reference: "VND-240915-1274", description: "Order VND-240915-1274 — ZenBook 14", orderId: "vord-3", createdAt: daysAgo(2) },
  { id: "tx-4", vendorId: "user-vendor-1", type: "payout", amount: -850000, reference: "PO-2409-0031", description: "Payout to GTBank ••••6789", createdAt: daysAgo(4) },
  { id: "tx-5", vendorId: "user-vendor-1", type: "sale", amount: 145000, reference: "VND-240913-1548", description: "Order VND-240913-1548 — Chronos Watch", orderId: "vord-5", createdAt: daysAgo(5) },
  { id: "tx-6", vendorId: "user-vendor-1", type: "refund", amount: -32500, reference: "RF-240912", description: "Refund — Order VND-240910-1959", orderId: "vord-8", createdAt: daysAgo(6) },
  { id: "tx-7", vendorId: "user-vendor-1", type: "subscription", amount: -7500, reference: "SUB-GROWTH-09", description: "Growth plan — September", createdAt: daysAgo(12) },
  { id: "tx-8", vendorId: "user-vendor-1", type: "sale", amount: 265000, reference: "VND-240905-2096", description: "Order VND-240905-2096 — 43\" Smart TV", createdAt: daysAgo(13) },
  { id: "tx-9", vendorId: "user-vendor-1", type: "payout", amount: -1200000, reference: "PO-2408-0027", description: "Payout to GTBank ••••6789", createdAt: daysAgo(18) },
];

export const payouts: Payout[] = [
  { id: "po-1", vendorId: "user-vendor-1", amount: 850000, status: "paid", bankAccount, reference: "PO-2409-0031", requestedAt: daysAgo(4, 6), paidAt: daysAgo(4) },
  { id: "po-2", vendorId: "user-vendor-1", amount: 1200000, status: "paid", bankAccount, reference: "PO-2408-0027", requestedAt: daysAgo(18, 5), paidAt: daysAgo(18) },
  { id: "po-3", vendorId: "user-vendor-1", amount: 640000, status: "paid", bankAccount, reference: "PO-2408-0019", requestedAt: daysAgo(32), paidAt: daysAgo(31) },
  { id: "po-4", vendorId: "user-vendor-1", amount: 410000, status: "failed", bankAccount, reference: "PO-2407-0012", requestedAt: daysAgo(46) },
];

export const deliverySettings: DeliverySettings = {
  zones: [
    { id: "zone-1", name: "Lagos Mainland", states: ["Lagos"], fee: 2000, etaDays: [1, 2], active: true },
    { id: "zone-2", name: "Lagos Island & Lekki", states: ["Lagos"], fee: 2500, etaDays: [1, 2], active: true },
    { id: "zone-3", name: "South West", states: ["Ogun", "Oyo", "Osun", "Ondo", "Ekiti"], fee: 4000, etaDays: [2, 4], active: true },
    { id: "zone-4", name: "Abuja & North Central", states: ["FCT", "Nasarawa", "Niger", "Kogi", "Kwara", "Plateau", "Benue"], fee: 5000, etaDays: [3, 5], active: true },
    { id: "zone-5", name: "South East & South South", states: ["Enugu", "Anambra", "Imo", "Abia", "Ebonyi", "Rivers", "Delta", "Edo", "Akwa Ibom", "Cross River", "Bayelsa"], fee: 5500, etaDays: [3, 6], active: true },
    { id: "zone-6", name: "North", states: ["Kano", "Kaduna", "Katsina", "Sokoto", "Kebbi", "Zamfara", "Jigawa", "Bauchi", "Gombe", "Borno", "Yobe", "Adamawa", "Taraba"], fee: 7000, etaDays: [4, 7], active: false },
  ],
  pickupAvailable: true,
  pickupAddress: "Shop 14, Computer Village, Ikeja, Lagos",
  freeDeliveryAbove: 500000,
};

export const vendorOverview: VendorOverview = {
  totalRevenue: 14620000,
  ordersCount: 342,
  productsCount: 48,
  customersCount: 286,
  pendingOrders: 6,
  lowStockCount: 4,
  availableBalance: vendorBalance.available,
  revenueSeries: [
    { label: "Mar", value: 1420000 }, { label: "Apr", value: 1680000 }, { label: "May", value: 1510000 },
    { label: "Jun", value: 2050000 }, { label: "Jul", value: 2310000 }, { label: "Aug", value: 2640000 }, { label: "Sep", value: 3010000 },
  ],
  ordersSeries: [
    { label: "Mon", value: 8 }, { label: "Tue", value: 12 }, { label: "Wed", value: 9 }, { label: "Thu", value: 15 },
    { label: "Fri", value: 18 }, { label: "Sat", value: 22 }, { label: "Sun", value: 11 },
  ],
  topProducts: [
    { productId: "p-aurora-5g", name: "Aurora 5G Smartphone", sales: 890, revenue: 218050000 },
    { productId: "p-nova-buds", name: "Nova ANC Earbuds", sales: 460, revenue: 14950000 },
    { productId: "p-smart-tv-43", name: "43\" 4K Smart TV", sales: 210, revenue: 55650000 },
    { productId: "p-chronos-watch", name: "Chronos Steel Watch", sales: 140, revenue: 20300000 },
    { productId: "p-zenbook-14", name: "ZenBook 14 Ultrabook", sales: 120, revenue: 118200000 },
  ],
};
