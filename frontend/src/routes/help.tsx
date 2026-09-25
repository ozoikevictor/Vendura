import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  ShoppingBag,
  Store,
  CreditCard,
  Truck,
  UserRound,
  ShieldCheck,
} from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/help")({ component: HelpPage });

const topics = [
  { icon: ShoppingBag, title: "Buying", text: "Cart, checkout, orders, and product questions." },
  { icon: Store, title: "Selling", text: "Store setup, listings, subscriptions, and payouts." },
  {
    icon: CreditCard,
    title: "Payments",
    text: "Payment status, failed payments, fees, and refunds.",
  },
  { icon: Truck, title: "Delivery", text: "Delivery estimates, pickup, addresses, and delays." },
  {
    icon: UserRound,
    title: "Accounts",
    text: "Sign-in, verification, profiles, and password help.",
  },
  {
    icon: ShieldCheck,
    title: "Safety",
    text: "Account protection, suspicious activity, and reporting.",
  },
];

const faqs = [
  [
    "How do I track an order?",
    "Sign in, open Orders from your profile, and select the order to view its latest seller and delivery status.",
  ],
  [
    "Can I shop before creating an account?",
    "Yes. You can browse and add products to your cart as a guest. Vendura asks you to sign in or create an account when you continue to checkout.",
  ],
  [
    "What happens when a product is out of stock?",
    "Products with no available stock are removed from the public marketplace until the seller restocks them.",
  ],
  [
    "How do I contact a seller?",
    "Open a product and select the message option. Keep the conversation in Vendura so the order context and safety record remain available.",
  ],
  [
    "How do refunds work?",
    "Submit a return or support request with the order details. Approved refunds are returned through the original payment method or another agreed method.",
  ],
  [
    "How do seller subscriptions work?",
    "Seller plans are monthly. Each plan has a product limit and access continues while the subscription is active.",
  ],
];

function HelpPage() {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? faqs.filter(([question, answer]) => `${question} ${answer}`.toLowerCase().includes(term))
      : faqs;
  }, [query]);
  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader publicMode />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="text-xs font-semibold uppercase text-primary">Support</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Help Center</h1>
        <p className="mt-2 text-muted-foreground">
          Find quick answers about shopping, selling, payments, and your account.
        </p>
        <label className="relative mt-6 block max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search help..."
            className="w-full rounded-lg border border-input bg-card py-3 pl-10 pr-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-4">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {shown.map(([question, answer]) => (
              <details key={question} className="group py-4">
                <summary className="cursor-pointer list-none pr-6 font-semibold text-foreground">
                  {question}
                </summary>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{answer}</p>
              </details>
            ))}
            {shown.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">No matching answer was found.</p>
            )}
          </div>
        </section>
        <div className="mt-10 border-l-4 border-primary bg-primary-soft p-5">
          <h2 className="font-semibold">Still need help?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send the Vendura team the details and keep the reference number we provide.
          </p>
          <Link
            to="/contact"
            className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Contact Vendura
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
