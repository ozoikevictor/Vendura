/**
 * Vendura domain models.
 *
 * These mirror the shapes a future Node/Express/MongoDB backend will return.
 * Keep them serialisable (no class instances, no Dates — use ISO strings).
 */

export type ID = string;
export type ISODate = string;

/* ----------------------------- Users ----------------------------- */

export type UserRole = "customer" | "vendor" | "admin";

export interface User {
  id: ID;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  storeId?: ID;
  emailVerified: boolean;
  createdAt: ISODate;
}

export interface Customer extends User {
  role: "customer";
  defaultAddressId?: ID;
}

export interface Vendor extends User {
  role: "vendor";
  storeId: ID;
  subscriptionId?: ID;
}

/* ----------------------------- Store ----------------------------- */

export interface StorePolicies {
  returns: string;
  shipping: string;
  warranty?: string;
}

export interface Store {
  id: ID;
  slug: string;
  name: string;
  tagline?: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  ownerId: ID;
  categoryIds: ID[];
  location: { city: string; state: string };
  rating: number;
  reviewCount: number;
  productCount: number;
  followers: number;
  verified: boolean;
  allowNegotiation: boolean;
  policies: StorePolicies;
  contact: { phone?: string; email?: string; whatsapp?: string };
  joinedAt: ISODate;
}

/* ---------------------------- Category --------------------------- */

export interface Subcategory {
  id: ID;
  slug: string;
  name: string;
}

export interface Category {
  id: ID;
  slug: string;
  name: string;
  /** lucide icon name, resolved in the UI layer */
  icon: string;
  description?: string;
  productCount: number;
  subcategories: Subcategory[];
}

/* ---------------------------- Product ---------------------------- */

export type ProductStatus = "active" | "draft" | "out_of_stock" | "archived";

export interface VariantOption {
  /** e.g. "Color", "Size", "Storage" */
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: ID;
  sku: string;
  /** e.g. { Color: "Black", Storage: "256GB" } */
  attributes: Record<string, string>;
  price?: number; // override, otherwise product.price
  stock: number;
  imageUrl?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface DeliveryOption {
  id: ID;
  label: string;
  /** Fee is indicative only; final fee is computed by backend at checkout. */
  fee: number;
  etaDays: [number, number];
}

export interface Product {
  id: ID;
  slug: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  oldPrice?: number;
  currency: "NGN";
  categoryId: ID;
  subcategoryId?: ID;
  storeId: ID;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  rating: number;
  reviewCount: number;
  soldCount: number;
  status: ProductStatus;
  negotiable: boolean;
  variantOptions: VariantOption[];
  variants: ProductVariant[];
  specifications: ProductSpecification[];
  deliveryOptions: DeliveryOption[];
  tags: string[];
  featured?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ------------------------- Cart & Wishlist ----------------------- */

export interface CartItem {
  id: ID; // productId + variantId
  productId: ID;
  productName: string;
  productSlug: string;
  productImage: string;
  availableStock: number;
  variantId?: ID;
  storeId: ID;
  quantity: number;
  /** Snapshot for display; backend must re-validate price on checkout. */
  unitPrice: number;
  /** Present when a negotiated offer was accepted. Backend validates offerId. */
  negotiated?: { offerId: ID; agreedPrice: number };
  savedForLater?: boolean;
  addedAt: ISODate;
}

export interface WishlistItem {
  productId: ID;
  addedAt: ISODate;
}

/* ----------------------------- Orders ---------------------------- */

export type OrderStatus =
  | "placed"
  | "payment_confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "card" | "bank_transfer" | "pay_on_delivery" | "wallet";

export interface DeliveryAddress {
  id: ID;
  label?: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  landmark?: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: ID;
  productId: ID;
  productName: string;
  productImage: string;
  variantLabel?: string;
  quantity: number;
  unitPrice: number;
  negotiated?: boolean;
  subtotal: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  at: ISODate;
  note?: string;
}

export type EscrowStatus = "not_funded" | "held" | "released" | "refunded" | "disputed";

/**
 * Buyer-protection escrow. The backend is the only source of truth for these
 * values — it holds the funds, validates release requests and settles disputes.
 */
export interface Escrow {
  status: EscrowStatus;
  /** Amount held on behalf of the buyer, in kobo-free Naira. */
  amount: number;
  fundedAt?: ISODate;
  releasedAt?: ISODate;
  /** Funds auto-release to the vendor at this time if the buyer stays silent. */
  autoReleaseAt?: ISODate;
  disputeReason?: string;
  disputeOpenedAt?: ISODate;
}

export interface Order {
  id: ID;
  orderNumber: string;
  customerId: ID;
  customerName: string;
  customerPhone: string;
  storeId: ID;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: DeliveryAddress;
  deliveryMethod: string;
  trackingNumber?: string;
  timeline: OrderTimelineEvent[];
  escrow?: Escrow;
  placedAt: ISODate;
  estimatedDelivery?: ISODate;
}

/* --------------------------- Messaging --------------------------- */

export type OfferStatus = "pending" | "accepted" | "rejected" | "countered" | "expired";

export interface Offer {
  id: ID;
  conversationId: ID;
  productId: ID;
  originalPrice: number;
  offeredPrice: number;
  counterPrice?: number;
  status: OfferStatus;
  /** "customer" | "vendor" — who made the most recent move */
  by: "customer" | "vendor";
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type MessageKind = "text" | "offer" | "system";

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  senderRole: "customer" | "vendor" | "system";
  kind: MessageKind;
  text?: string;
  offerId?: ID;
  sentAt: ISODate;
  read: boolean;
}

export interface Conversation {
  id: ID;
  productId: ID;
  productName: string;
  productImage: string;
  productPrice: number;
  storeId: ID;
  storeName: string;
  customerId: ID;
  customerName: string;
  lastMessage: string;
  lastMessageAt: ISODate;
  unreadForCustomer: number;
  unreadForVendor: number;
  activeOfferId?: ID;
  agreedPrice?: number;
}

/* -------------------------- Notifications ------------------------ */

export type NotificationType =
  | "new_order"
  | "new_message"
  | "new_offer"
  | "offer_accepted"
  | "offer_rejected"
  | "low_stock"
  | "payment_received"
  | "order_cancelled"
  | "order_confirmed"
  | "order_processing"
  | "order_shipped"
  | "order_delivered"
  | "order_refunded"
  | "payout_processed"
  | "system";

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: ISODate;
}

/* ---------------------- Subscription & Finance ------------------- */

export type PlanId = "starter" | "growth" | "business";

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  productLimit: number | null; // null = unlimited
  features: string[];
  highlighted?: boolean;
}

export interface Subscription {
  id: ID;
  vendorId: ID;
  planId: PlanId;
  status: "active" | "past_due" | "cancelled" | "trialing";
  currentPeriodStart: ISODate;
  currentPeriodEnd: ISODate;
  autoRenew: boolean;
}

export type TransactionType = "sale" | "delivery" | "refund" | "payout" | "subscription" | "fee";

export interface Transaction {
  id: ID;
  vendorId: ID;
  type: TransactionType;
  amount: number; // positive = credit, negative = debit
  reference: string;
  description: string;
  orderId?: ID;
  createdAt: ISODate;
  status?: "pending" | "available" | "reversed";
}

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export interface BankAccount {
  bankName: string;
  bankCode?: string;
  accountNumber: string;
  accountName: string;
  verified: boolean;
  recipientCode?: string;
  verifiedAt?: ISODate;
}

export interface NigerianBank {
  id: number;
  name: string;
  code: string;
}

export interface Payout {
  id: ID;
  vendorId: ID;
  amount: number;
  status: PayoutStatus;
  bankAccount: BankAccount;
  reference: string;
  requestedAt: ISODate;
  paidAt?: ISODate;
}

export interface VendorBalance {
  available: number;
  pending: number;
  totalSales: number;
  deliveryFees: number;
  customerPayments: number;
  platformFees: number;
  totalPaid: number;
  nextPayoutAt?: ISODate;
}

/* --------------------------- Delivery ---------------------------- */

export interface DeliveryZone {
  id: ID;
  name: string; // e.g. "Lagos Mainland"
  states: string[];
  fee: number;
  etaDays: [number, number];
  active: boolean;
}

export interface DeliverySettings {
  zones: DeliveryZone[];
  pickupAvailable: boolean;
  pickupAddress?: string;
  freeDeliveryAbove?: number;
}

/* ---------------------------- Analytics -------------------------- */

export interface TimeSeriesPoint {
  label: string; // e.g. "Mon", "Jan"
  value: number;
}

export interface VendorOverview {
  totalRevenue: number;
  ordersCount: number;
  productsCount: number;
  customersCount: number;
  pendingOrders: number;
  lowStockCount: number;
  availableBalance: number;
  revenueSeries: TimeSeriesPoint[];
  ordersSeries: TimeSeriesPoint[];
  topProducts: { productId: ID; name: string; sales: number; revenue: number }[];
}

/* ------------------------ Generic API shapes --------------------- */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductQuery {
  q?: string;
  categorySlug?: string;
  subcategorySlug?: string;
  storeId?: ID;
  minPrice?: number;
  maxPrice?: number;
  negotiableOnly?: boolean;
  inStockOnly?: boolean;
  sort?: "relevance" | "newest" | "price_asc" | "price_desc" | "rating" | "popular";
  page?: number;
  pageSize?: number;
}
