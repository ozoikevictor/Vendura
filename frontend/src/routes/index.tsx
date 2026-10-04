import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Store,
  ShieldCheck,
  Truck,
  Wallet,
  MessageSquare,
  BarChart3,
  ShoppingBasket,
  Link as LinkIcon,
  LogIn,
  Pause,
  Play,
} from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { categories, popularCategorySlugs } from "@/data/categories";
import heroGroceries from "@/assets/hero-groceries.jpg";
import heroFashion from "@/assets/hero-fashion.jpg";
import heroElectronics from "@/assets/hero-electronics.jpg";
import heroShoes from "@/assets/hero-shoes.jpg";
import heroHome from "@/assets/hero-home.jpg";
import heroDelivery from "@/assets/hero-delivery.jpg";
import { useStorefrontStore } from "@/store/storefront";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { ProductCard } from "@/components/shared/ProductCard";
import { StoreCard } from "@/components/shared/StoreCard";
import { DataLoader } from "@/components/shared/DataLoader";
import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { getFeaturedProducts } from "@/services/productService";
import { getFeaturedStores } from "@/services/storeService";
import { getCategories } from "@/services/categoryService";
import { canonicalLink, seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: seoMeta({
      title: "Vendraza | Shop Products & Discover Vendors Online",
      description:
        "Shop products online in Nigeria, discover trusted vendors, and open your own store on Vendraza's multi-vendor marketplace.",
      path: "/",
    }),
    links: canonicalLink("/"),
  }),
});

const heroSlides = [
  { src: heroGroceries, alt: "A customer shopping for groceries from a Nigerian vendor" },
  { src: heroFashion, alt: "A Nigerian fashion vendor arranging clothes in her store" },
  { src: heroElectronics, alt: "A customer shopping for electronics with a Nigerian vendor" },
  { src: heroShoes, alt: "A customer choosing shoes from a Nigerian footwear vendor" },
  { src: heroHome, alt: "A Nigerian vendor presenting cookware and home essentials" },
  { src: heroDelivery, alt: "A marketplace order being delivered to a customer" },
];

function Index() {
  const clearActiveStore = useStorefrontStore((state) => state.clearActiveStore);
  const [activeHero, setActiveHero] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const { data: featuredProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["landing", "featured-products"],
    queryFn: () => getFeaturedProducts(8),
    staleTime: 60_000,
  });
  const { data: featuredStores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["landing", "featured-stores"],
    queryFn: () => getFeaturedStores(3),
    staleTime: 120_000,
  });
  const { data: liveCategories = [] } = useQuery({
    queryKey: ["landing", "categories"],
    queryFn: getCategories,
    staleTime: 120_000,
  });
  const storeById = new Map(featuredStores.map((store) => [store.id, store]));
  const liveCategoriesBySlug = new Map(liveCategories.map((category) => [category.slug, category]));
  const popularCategories = categories
    .filter((category) => popularCategorySlugs.includes(category.slug))
    .map((category) => ({
      ...category,
      ...(liveCategoriesBySlug.get(category.slug) ?? {}),
      productCount:
        liveCategoriesBySlug.get(category.slug)?.productCount ?? category.productCount ?? 0,
    }));

  useEffect(() => {
    clearActiveStore();
  }, [clearActiveStore]);

  useEffect(() => {
    if (heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      setActiveHero((current) => (current + 1) % heroSlides.length);
    }, 5500);

    return () => window.clearInterval(interval);
  }, [heroPaused]);

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader publicMode />

      {/* Hero cover and introduction */}
      <section className="hero-stage relative isolate min-h-[22rem] overflow-hidden sm:min-h-[24rem] lg:min-h-[25rem]">
        <div className="hero-media absolute inset-0 -z-20" aria-live="off">
          {heroSlides.map((slide, index) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={index === activeHero ? slide.alt : ""}
              aria-hidden={index !== activeHero}
              className={`hero-slide absolute inset-0 h-full w-full object-cover ${
                index === activeHero ? "is-active" : ""
              }`}
            />
          ))}
        </div>
        <div className="hero-image-overlay absolute inset-0 -z-10" />
        <div className="hero-content-shell mx-auto flex min-h-[22rem] max-w-7xl items-center justify-start px-4 py-8 sm:min-h-[24rem] sm:px-6 lg:min-h-[25rem] lg:px-8">
          <div className="hero-sequence w-full max-w-lg text-left text-white drop-shadow-[0_3px_18px_rgba(0,0,0,0.45)]">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-white/85">
              Nigeria's Multi-Vendor Marketplace
            </p>
            <h1 className="hero-headline font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Shop Nigerian sellers in one trusted marketplace.
            </h1>
            <p className="copy-float mt-3 max-w-md text-sm leading-6 text-white/90 sm:text-base">
              Find phones, fashion, home goods, beauty products, and building materials from
              independent vendors across Nigeria.
            </p>
            <div className="hero-actions mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/marketplace"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:bg-primary/90 hover:shadow-frost sm:w-auto"
              >
                Shop the marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/categories"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/95 px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-all hover:bg-white sm:w-auto"
              >
                Browse categories
              </Link>
              <Link
                to="/vendor-register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/50 bg-black/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-black/30 sm:w-auto"
              >
                <Store className="h-4 w-4" />
                Start selling
              </Link>
            </div>
            <div className="hero-trust mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/85 sm:text-sm">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#b7e3c4]" /> Verified vendors
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-[#b7e3c4]" /> Nationwide delivery
              </span>
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-[#b7e3c4]" /> Secure payments
              </span>
            </div>
          </div>
        </div>
        <div className="hero-controls absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 py-2 backdrop-blur-sm">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setActiveHero(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === activeHero ? "w-7 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
              }`}
              aria-label={`Show hero image ${index + 1} of ${heroSlides.length}`}
              aria-current={index === activeHero ? "true" : undefined}
            />
          ))}
          <button
            type="button"
            onClick={() => setHeroPaused((paused) => !paused)}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
            aria-label={heroPaused ? "Play hero slideshow" : "Pause hero slideshow"}
            title={heroPaused ? "Play slideshow" : "Pause slideshow"}
          >
            {heroPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      </section>

      {/* Live marketplace preview */}
      <ScrollReveal>
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Live marketplace"
              title="Products Available Now"
              description="Browse current listings from independent sellers. Prices, stock, and store details come directly from the marketplace."
              action={
                <Link
                  to="/marketplace"
                  className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
                >
                  View marketplace <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {productsLoading ? (
              <div className="mt-7">
                <ProductGridSkeleton count={8} />
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="stagger-grid mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {featuredProducts.map((product) => {
                  const store = storeById.get(product.storeId);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      className="landing-card-lift"
                      {...(store ? { storeName: store.name, storeSlug: store.slug } : {})}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="mt-7 border-y border-border py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  New products are being prepared for the marketplace.
                </p>
                <Link
                  to="/marketplace"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Open marketplace <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
            <div className="mt-6 sm:hidden">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                View all products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section className="bg-card">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Shop by seller"
              title="Featured Stores"
              description="Visit real storefronts, review seller information, and shop their available products in one place."
              action={
                <Link
                  to="/stores"
                  className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
                >
                  Browse stores <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {storesLoading ? (
              <DataLoader label="Loading stores" className="min-h-40" />
            ) : featuredStores.length > 0 ? (
              <div className="stagger-grid mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredStores.map((store) => (
                  <StoreCard key={store.id} store={store} className="landing-card-lift" />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </ScrollReveal>

      {/* Popular Categories */}
      <ScrollReveal>
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Browse"
            title="Popular Categories"
            description="Shop across 22 categories from trusted Nigerian sellers."
            action={
              <Link
                to="/categories"
                className="hidden text-sm font-semibold text-primary hover:underline sm:block"
              >
                All categories →
              </Link>
            }
          />
          <div className="stagger-grid grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {popularCategories.map((c) => (
              <Link
                key={c.id}
                to="/categories/$slug"
                params={{ slug: c.slug }}
                className="landing-card-lift group overflow-hidden rounded-xl border border-border bg-card p-2 text-center shadow-card transition-all hover:border-primary/30 hover:shadow-frost"
              >
                <div className="aspect-[1.72/1] overflow-hidden rounded-lg border border-emerald-100/70 bg-[#eef8f1] transition-all group-hover:border-primary/25">
                  <CategoryArtwork slug={c.slug} name={c.name} />
                </div>
                <span className="mt-2 block min-h-8 text-xs font-semibold leading-tight text-foreground">
                  {c.name}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {c.productCount} {c.productCount === 1 ? "product" : "products"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* How Vendraza Works */}
      <ScrollReveal>
        <section className="bg-card border-y border-border">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="How it works"
              title="How Customers Shop"
              description="Customers can browse first, then create an account when they are ready to order."
              className="justify-center text-center [&_div]:items-center"
            />
            <div className="stagger-grid mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: LinkIcon,
                  title: "Open the store link",
                  desc: "Open the unique storefront link shared by the seller.",
                },
                {
                  icon: ShoppingBasket,
                  title: "Browse and add items",
                  desc: "View products and prepare a cart without creating an account first.",
                },
                {
                  icon: LogIn,
                  title: "Create or log in",
                  desc: "At checkout, create a customer account or log in. Your cart remains ready.",
                },
                {
                  icon: Truck,
                  title: "Pay and track",
                  desc: "Complete payment, follow delivery updates, and rate the order after completion.",
                },
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

      {/* Why Sell With Vendraza */}
      <ScrollReveal>
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground/70">
                  For Sellers
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Why Sell With Vendraza
                </h2>
                <p className="mt-3 max-w-md text-primary-foreground/80">
                  Launch your store, manage products, negotiate prices, and get paid — all from one
                  dashboard built for Nigerian commerce.
                </p>
                <Link
                  to="/vendor-register"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary-foreground/90"
                >
                  <Store className="h-4 w-4" />
                  Become a Seller
                </Link>
              </div>
              <div className="stagger-grid grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: Store,
                    title: "Custom Storefront",
                    desc: "Your own branded store page with banner, products, and policies.",
                  },
                  {
                    icon: MessageSquare,
                    title: "Price Negotiation",
                    desc: "Enable per-product negotiation. Accept, reject, or counter offers.",
                  },
                  {
                    icon: BarChart3,
                    title: "Analytics",
                    desc: "Track revenue, orders, top products, and customer insights.",
                  },
                  {
                    icon: Wallet,
                    title: "Fast Payouts",
                    desc: "Withdraw earnings to your Nigerian bank account.",
                  },
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
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Built for trust"
              title="Protection at Every Step"
              description="Practical safeguards for sellers, customers, orders, and payments."
              className="justify-center text-center [&_div]:items-center"
            />
            <div className="stagger-grid mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "Verified sellers",
                  desc: "Store verification helps customers recognize approved Vendraza businesses.",
                },
                {
                  icon: Wallet,
                  title: "Protected payments",
                  desc: "Payment status, fees, balances, and seller earnings remain visible and traceable.",
                },
                {
                  icon: MessageSquare,
                  title: "Clear communication",
                  desc: "Customers and sellers can keep order conversations together in one place.",
                },
                {
                  icon: Truck,
                  title: "Order tracking",
                  desc: "Both sides can follow every order from confirmation through delivery.",
                },
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

      <SiteFooter />
    </div>
  );
}
