import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { User, Phone, MapPin, CreditCard, Truck, Check, ShieldCheck } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { placeOrder } from "@/services/orderService";
import { initializePaystackPayment } from "@/services/paymentService";
import { nigerianStates } from "@/data/users";
import { getErrorMessage } from "@/services/api";
import { formatNaira } from "@/utils/format";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Vendura" },
      { name: "description", content: "Complete your Vendura purchase." },
      { property: "og:title", content: "Checkout — Vendura" },
      { property: "og:description", content: "Complete your Vendura purchase." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const allItems = useCartStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => !i.savedForLater), [allItems]);
  const clear = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [form, setForm] = useState({
    fullName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    street: "",
    city: "",
    state: "Lagos",
    landmark: "",
    deliveryMethod: "standard",
    paymentMethod: "pay_on_delivery" as "card" | "bank_transfer" | "pay_on_delivery",
  });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const storeSubtotals = items.reduce<Record<string, number>>((totals, item) => {
    totals[item.storeId] = (totals[item.storeId] ?? 0) + item.unitPrice * item.quantity;
    return totals;
  }, {});
  const deliveryFee = Object.values(storeSubtotals).reduce(
    (sum, storeSubtotal) => sum + calculateDeliveryFee(storeSubtotal, form.deliveryMethod),
    0,
  );
  const total = subtotal + deliveryFee;
  const paymentAttemptKey = "vendura-paystack-attempt";
  const cartFingerprint = JSON.stringify(items.map((item) => ({ id: item.id, quantity: item.quantity, price: item.unitPrice })));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || user.role !== "customer") return;
    if (!user.emailVerified) {
      setError("Verify your email before placing an order.");
      return;
    }
    if (
      form.fullName.trim().length < 2 ||
      form.phone.trim().length < 7 ||
      form.street.trim().length < 3 ||
      form.city.trim().length < 2
    ) {
      setError("Complete your name, phone number, and delivery address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const savedAttempt = form.paymentMethod === "card"
        ? JSON.parse(window.sessionStorage.getItem(paymentAttemptKey) ?? "null") as { fingerprint?: string; orderIds?: string[] } | null
        : null;
      if (form.paymentMethod === "card" && savedAttempt?.fingerprint === cartFingerprint && savedAttempt.orderIds?.length) {
        const payment = await initializePaystackPayment(savedAttempt.orderIds);
        window.sessionStorage.setItem("vendura-pending-payment", payment.reference);
        window.location.assign(payment.authorizationUrl);
        return;
      }

      const result = await placeOrder({
        items: items.map((i) => ({
          productId: i.productId,
          ...(i.variantId ? { variantId: i.variantId } : {}),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          ...(i.negotiated ? { negotiated: i.negotiated } : {}),
        })),
        deliveryAddress: {
          id: `addr-${Date.now()}`,
          fullName: form.fullName,
          phone: form.phone,
          street: form.street,
          city: form.city,
          state: form.state,
          ...(form.landmark ? { landmark: form.landmark } : {}),
        },
        deliveryMethod: form.deliveryMethod,
        paymentMethod: form.paymentMethod,
      });
      if (form.paymentMethod === "card") {
        const orderIds = result.orders.map((order) => order.id);
        window.sessionStorage.setItem(paymentAttemptKey, JSON.stringify({ fingerprint: cartFingerprint, orderIds }));
        const payment = await initializePaystackPayment(orderIds);
        window.sessionStorage.setItem("vendura-pending-payment", payment.reference);
        window.location.assign(payment.authorizationUrl);
        return;
      }
      setSuccess(result);
      clear();
      window.sessionStorage.removeItem(paymentAttemptKey);
      toast.success("Order placed successfully!");
    } catch (caught) {
      const message = getErrorMessage(caught, "Could not place order. Please try again.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-lg px-4 py-16">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">Order Confirmed!</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your order number is{" "}
              <span className="font-semibold text-foreground">{success.orderNumber}</span>
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/customer/orders"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                View Orders
              </Link>
              <Link
                to="/marketplace"
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">Your cart is empty</h1>
          <Link
            to="/marketplace"
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse Marketplace
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!user || user.role !== "customer") {
    const sellerSignedIn = user?.role === "vendor";

    const switchAccount = () => {
      clearAuth();
      navigate({ to: "/login" });
    };

    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            {sellerSignedIn ? "You are signed in as a seller" : "Customer account required"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sellerSignedIn
              ? "Seller accounts manage stores and orders. Switch to a customer account to buy this product."
              : "Log in or create a customer account to complete this order."}{" "}
            Your cart will stay here.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {sellerSignedIn ? (
              <button
                type="button"
                onClick={switchAccount}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Switch to customer account
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Log in
              </Link>
            )}
            <Link
              to="/register"
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground"
            >
              Create account
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Checkout</h1>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-6 lg:grid-cols-[1fr_22rem]">
          {/* Left: forms */}
          <div className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            {/* Contact */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                <User className="h-4 w-4 text-primary" /> Contact Information
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-1 block text-xs font-medium text-foreground"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    required
                    value={form.fullName}
                    onChange={set("fullName")}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-xs font-medium text-foreground">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="phone"
                      type="tel"
                      required
                      value={form.phone}
                      onChange={set("phone")}
                      placeholder="0801 234 5678"
                      className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Delivery Address
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label
                    htmlFor="street"
                    className="mb-1 block text-xs font-medium text-foreground"
                  >
                    Street address
                  </label>
                  <input
                    id="street"
                    required
                    value={form.street}
                    onChange={set("street")}
                    placeholder="House number, street name"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="city"
                      className="mb-1 block text-xs font-medium text-foreground"
                    >
                      City
                    </label>
                    <input
                      id="city"
                      required
                      value={form.city}
                      onChange={set("city")}
                      placeholder="e.g. Ikeja"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="state"
                      className="mb-1 block text-xs font-medium text-foreground"
                    >
                      State
                    </label>
                    <select
                      id="state"
                      value={form.state}
                      onChange={set("state")}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      {nigerianStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="landmark"
                    className="mb-1 block text-xs font-medium text-foreground"
                  >
                    Landmark (optional)
                  </label>
                  <input
                    id="landmark"
                    value={form.landmark}
                    onChange={set("landmark")}
                    placeholder="e.g. near Zenith Bank"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </section>

            {/* Delivery method */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                <Truck className="h-4 w-4 text-primary" /> Delivery Method
              </h2>
              <div className="mt-3 space-y-2">
                {[
                  {
                    id: "standard",
                    label: "Standard Delivery",
                    desc: "3–5 business days",
                    fee: formatNaira(Object.values(storeSubtotals).reduce((sum, amount) => sum + calculateDeliveryFee(amount, "standard"), 0)),
                  },
                  {
                    id: "express",
                    label: "Express Delivery",
                    desc: "1–2 business days",
                    fee: formatNaira(Object.values(storeSubtotals).reduce((sum, amount) => sum + calculateDeliveryFee(amount, "express"), 0)),
                  },
                  { id: "pickup", label: "Store Pickup", desc: "Pick up from seller", fee: "Free" },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value={opt.id}
                      checked={form.deliveryMethod === opt.id}
                      onChange={set("deliveryMethod")}
                      className="accent-primary"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{opt.fee}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-primary" /> Payment Method
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Paystack securely handles online card and bank payments.
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary-soft/40 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Buyer Protection:</span> Vendura
                  holds your payment and only pays the seller after you confirm your order arrived
                  as described.
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  {
                    id: "card",
                    label: "Pay Online with Paystack",
                    desc: "Card, bank transfer, USSD, or another available Paystack option",
                  },
                  {
                    id: "pay_on_delivery",
                    label: "Pay on Delivery",
                    desc: "Cash or transfer on arrival",
                  },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.id}
                      checked={form.paymentMethod === opt.id}
                      onChange={set("paymentMethod")}
                      className="accent-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Right: summary */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">Order Summary</h2>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto scrollbar-none">
                {items.map((item) => {
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <img
                        src={item.productImage}
                        alt=""
                        className="h-10 w-10 rounded border border-border object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-1">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {formatNaira(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fee</span>
                  <span className="text-foreground">{deliveryFee === 0 ? "Free" : formatNaira(deliveryFee)}</span>
                </div>
                <div className="border-t border-border pt-1.5">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total (est.)</span>
                    <span className="text-lg font-bold text-primary">{formatNaira(total)}</span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? (form.paymentMethod === "card" ? "Opening Paystack..." : "Placing order...") : (form.paymentMethod === "card" ? `Pay ${formatNaira(total)}` : "Place Order")}
              </button>
              <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Backend validates all prices and fees
              </p>
            </div>
          </div>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}

function calculateDeliveryFee(subtotal: number, method: string) {
  if (method === "pickup" || subtotal >= 500000) return 0;
  return method === "express" ? 5000 : 2500;
}
