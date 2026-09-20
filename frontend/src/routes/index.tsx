import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight, Store, ShieldCheck, Truck, Wallet,
  MessageSquare, BarChart3, ShoppingBasket, CheckCircle2,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { categories, popularCategorySlugs } from "@/data/categories";
import { plans } from "@/data/finance";
import { formatNaira } from "@/utils/format";
import heroImg from "@/assets/hero-marketplace.jpg";
import { useStorefrontStore } from "@/store/storefront";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Vendura — Sell Smarter. Shop Anywhere." },
      { name: "description", content: "Nigeria's multi-vendor marketplace. Buy and sell phones, fashion, building materials, and more from verified vendors nationwide." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Vendura — Sell Smarter. Shop Anywhere." },
      { property: "og:description", content: "Nigeria's multi-vendor marketplace. Buy and sell from verified vendors nationwide." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const clearActiveStore = useStorefrontStore((state) => state.clearActiveStore);

  useEffect(() => {
    clearActiveStore();
  }, [clearActiveStore]);

  return (
    <div className="min-h-screen lagoon-wash">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="animate-rise">
              <p className="eyebrow mb-4">Nigeria's Multi-Vendor Marketplace</p>
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Sell Smarter.
                <br />
                <span className="text-primary">Shop Anywhere.</span>
              </h1>
              <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
                From phones to fashion, building materials to baby products —
                buy from verified vendors across Nigeria, or start your own store
                in minutes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90 hover:shadow-frost"
                >
                  Explore Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/vendor-register"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:bg-accent"
                >
                  <Store className="h-4 w-4" />
                  Start Selling
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Verified vendors
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-primary" />
                  Nationwide delivery
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  Secure payouts
                </span>
              </div>
            </div>

            {/* Hero image */}
            <div className="relative animate-settle">
              <div className="overflow-hidden rounded-2xl border border-border shadow-frost">
                <img
                  src={heroImg}
                  alt="Vendura marketplace"
                  className="h-full w-full object-cover"
                />
              </div>
              {/* Floating card */}
              <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-card p-3 shadow-frost sm:block">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-soft text-success">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Built for every seller</p>
                    <p className="text-xs text-muted-foreground">Your store, products, and customers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Browse"
          title="Popular Categories"
          description="Shop across 22 categories from trusted Nigerian sellers."
          action={
            <Link to="/explore" className="hidden text-sm font-semibold text-primary hover:underline sm:block">
              All categories →
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories
            .filter((c) => popularCategorySlugs.includes(c.slug))
            .map((c) => (
              <Link
                key={c.id}
                to="/explore"
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-frost hover:border-primary/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <CategoryIcon name={c.icon} className="h-6 w-6" />
                </div>
                <span className="text-center text-xs font-medium text-foreground">
                  {c.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatNaira(c.productCount, { compact: true })}
                </span>
              </Link>
            ))}
        </div>
      </section>

      {/* How Vendura Works */}
      <section className="bg-card border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="How it works"
            title="How Vendura Works"
            description="Buy and sell in three simple steps."
            className="justify-center text-center [&_div]:items-center"
          />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { icon: ShoppingBasket, title: "Browse & Buy", desc: "Search across thousands of products from verified vendors. Filter by category, price, and location." },
              { icon: MessageSquare, title: "Negotiate & Chat", desc: "Message sellers directly. Make offers, counter, and agree on a price — all within the chat." },
              { icon: Truck, title: "Delivered to You", desc: "Track every order with real-time status updates. Pay with card, bank transfer, or on delivery." },
            ].map((step, i) => (
              <div key={i} className="relative rounded-xl border border-border bg-background p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="absolute right-4 top-4 font-mono text-3xl font-bold text-primary/15">
                  0{i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Sell With Vendura */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground/70">
                For Sellers
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Why Sell With Vendura
              </h2>
              <p className="mt-3 max-w-md text-primary-foreground/80">
                Launch your store, manage products, negotiate prices, and get paid —
                all from one dashboard built for Nigerian commerce.
              </p>
              <Link
                to="/vendor-register"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-foreground/90"
              >
                <Store className="h-4 w-4" />
                Become a Seller
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Store, title: "Custom Storefront", desc: "Your own branded store page with banner, products, and policies." },
                { icon: MessageSquare, title: "Price Negotiation", desc: "Enable per-product negotiation. Accept, reject, or counter offers." },
                { icon: BarChart3, title: "Analytics", desc: "Track revenue, orders, top products, and customer insights." },
                { icon: Wallet, title: "Fast Payouts", desc: "Withdraw earnings to your Nigerian bank account." },
              ].map((f, i) => (
                <div key={i} className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-0.5 text-xs text-primary-foreground/70">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Plans for Every Seller"
          description="Start free and scale as you grow. No hidden fees."
          className="justify-center text-center [&_div]:items-center"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 ${plan.highlighted ? "border-primary bg-card shadow-frost" : "border-border bg-card shadow-card"}`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {formatNaira(plan.priceMonthly)}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/vendor-register"
                className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${plan.highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border text-foreground hover:bg-accent"}`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter publicMode />
    </div>
  );
}
