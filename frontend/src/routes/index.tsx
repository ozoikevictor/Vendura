import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight, Store, ShieldCheck, Truck, Wallet,
  MessageSquare, BarChart3, ShoppingBasket, CheckCircle2,
  UserPlus, PackagePlus, Share2, Link as LinkIcon, LogIn,
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
import { ScrollReveal } from "@/components/shared/ScrollReveal";

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

      {/* Hero image and introduction */}
      <section className="overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
          <div className="animate-settle overflow-hidden rounded-2xl border border-border bg-card shadow-frost">
            <img
              src={heroImg}
              alt="Customers and sellers using the Vendura marketplace"
              className="h-56 w-full object-cover sm:h-80 lg:h-[26rem]"
            />
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:px-8">
          <div className="animate-rise">
            <p className="eyebrow mb-4">Nigeria's Multi-Vendor Marketplace</p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Sell Smarter. <span className="text-primary">Shop Anywhere.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              From phones to fashion, building materials to home essentials, buy from trusted vendors across Nigeria or start your own store in minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90 hover:shadow-frost"
              >
                Shop the marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:bg-accent"
              >
                <UserPlus className="h-4 w-4" />
                Create a customer account
              </Link>
              <Link
                to="/vendor-register"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary-soft px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                <Store className="h-4 w-4" />
                Start selling
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Verified vendors</span>
              <span className="flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" /> Nationwide delivery</span>
              <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-primary" /> Secure payments</span>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <ScrollReveal>
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
      </ScrollReveal>

      {/* Seller Account Steps */}
      <ScrollReveal>
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Start selling"
            title="Create Your Seller Account"
            description="Go from registration to a shareable online store in four clear steps."
            className="justify-center text-center [&_div]:items-center"
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: UserPlus, title: "Create your account", desc: "Enter your personal and business details to open a secure seller account." },
              { icon: Store, title: "Set up your store", desc: "Add your store name, description, location, logo, and delivery information." },
              { icon: PackagePlus, title: "Add your products", desc: "Upload product photos, prices, stock, categories, and negotiation settings." },
              { icon: Share2, title: "Share and sell", desc: "Copy your unique storefront link and send it to customers anywhere." },
            ].map((step, index) => (
              <div key={step.title} className="relative rounded-xl border border-border bg-background p-5 shadow-card transition-transform duration-300 hover:-translate-y-1">
                <span className="absolute right-4 top-4 font-mono text-2xl font-bold text-primary/20">0{index + 1}</span>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary"><step.icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/vendor-register" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Create seller account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* How Vendura Works */}
      <ScrollReveal>
      <section className="bg-card border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="How it works"
            title="How Customers Shop"
            description="Customers can browse first, then create an account when they are ready to order."
            className="justify-center text-center [&_div]:items-center"
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: LinkIcon, title: "Open the store link", desc: "Open the unique storefront link shared by the seller." },
              { icon: ShoppingBasket, title: "Browse and add items", desc: "View products and prepare a cart without creating an account first." },
              { icon: LogIn, title: "Create or log in", desc: "At checkout, create a customer account or log in. Your cart remains ready." },
              { icon: Truck, title: "Pay and track", desc: "Complete payment, follow delivery updates, and rate the order after completion." },
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
      </ScrollReveal>

      {/* Why Sell With Vendura */}
      <ScrollReveal>
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
      </ScrollReveal>

      {/* Trust and Protection */}
      <ScrollReveal>
      <section className="border-y border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Built for trust"
            title="Protection at Every Step"
            description="Practical safeguards for sellers, customers, orders, and payments."
            className="justify-center text-center [&_div]:items-center"
          />
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Verified sellers", desc: "Store verification helps customers recognize approved Vendura businesses." },
              { icon: Wallet, title: "Protected payments", desc: "Payment status, fees, balances, and seller earnings remain visible and traceable." },
              { icon: MessageSquare, title: "Clear communication", desc: "Customers and sellers can keep order conversations together in one place." },
              { icon: Truck, title: "Order tracking", desc: "Both sides can follow every order from confirmation through delivery." },
            ].map((item) => (
              <div key={item.title} className="border-l-2 border-primary px-5 py-2">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </ScrollReveal>

      {/* Pricing Preview */}
      <ScrollReveal>
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
      </ScrollReveal>

      <SiteFooter />
    </div>
  );
}
