import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeHelp,
  CreditCard,
  Gem,
  Grid3X3,
  Hammer,
  Home,
  Menu,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { StoreCard } from "@/components/shared/StoreCard";
import { categories as fallbackCategories, popularCategorySlugs } from "@/data/categories";
import { useStorefrontStore } from "@/store/storefront";
import { getCategories } from "@/services/categoryService";
import { getFeaturedProducts } from "@/services/productService";
import { getFeaturedStores } from "@/services/storeService";
import { canonicalLink, seoMeta } from "@/lib/seo";
import phone from "@/assets/products/phone.jpg";
import earbuds from "@/assets/products/earbuds.jpg";
import ankaraDress from "@/assets/products/ankara-dress.jpg";
import sneakers from "@/assets/products/sneakers.jpg";
import sofa from "@/assets/products/sofa.jpg";
import blender from "@/assets/products/blender.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: seoMeta({
      title: "Vendraza | Shop Nigerian Sellers Online",
      description:
        "Shop products from Nigerian vendors on Vendraza. Discover phones, fashion, home goods, beauty, building materials, and more.",
      path: "/",
    }),
    links: canonicalLink("/"),
  }),
});

const categoryIcons = [Smartphone, Shirt, Home, Sparkles, Hammer, Gem, ShoppingBag, Grid3X3];

const advertSlides = [
  {
    eyebrow: "Today on Vendraza",
    title: "Fresh deals from trusted sellers.",
    description:
      "Phones, fashion, home goods, beauty, building materials, and more from real vendors.",
    button: "Shop deals",
    to: "/marketplace" as const,
    images: [phone, earbuds],
    theme:
      "bg-[radial-gradient(circle_at_82%_35%,rgba(247,183,51,0.36),transparent_28%),linear-gradient(105deg,rgba(18,53,36,0.98),rgba(18,130,60,0.92))]",
  },
  {
    eyebrow: "New arrivals",
    title: "Fresh products from active vendors.",
    description: "Discover new listings, verified stores, and products customers can buy today.",
    button: "Explore stores",
    to: "/stores" as const,
    images: [ankaraDress, sneakers],
    theme:
      "bg-[radial-gradient(circle_at_82%_35%,rgba(216,247,223,0.32),transparent_28%),linear-gradient(105deg,#0d4f2b,#123524)]",
  },
  {
    eyebrow: "Browse faster",
    title: "Find the right item faster.",
    description: "Browse categories for phones, fashion, home, beauty, groceries, tools, and more.",
    button: "Browse categories",
    to: "/categories" as const,
    images: [sofa, blender],
    theme:
      "bg-[radial-gradient(circle_at_82%_35%,rgba(247,183,51,0.3),transparent_28%),linear-gradient(105deg,#14532d,#0f766e)]",
  },
];

function Index() {
  const clearActiveStore = useStorefrontStore((state) => state.clearActiveStore);

  const { data: liveCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["landing", "categories"],
    queryFn: getCategories,
    staleTime: 120_000,
  });
  const { data: featuredProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["landing", "featured-products"],
    queryFn: () => getFeaturedProducts(10),
    staleTime: 60_000,
  });
  const { data: featuredStores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["landing", "featured-stores"],
    queryFn: () => getFeaturedStores(3),
    staleTime: 120_000,
  });

  const categorySource = liveCategories.length > 0 ? liveCategories : fallbackCategories;
  const categoryTiles = categorySource
    .filter((category) =>
      liveCategories.length > 0
        ? Number(category.productCount ?? 0) > 0
        : popularCategorySlugs.includes(category.slug),
    )
    .slice(0, 12);
  const visibleCategories =
    categoryTiles.length > 0
      ? categoryTiles
      : categorySource.slice(0, Math.min(categorySource.length, 12));
  const sideCategories = visibleCategories.slice(0, 8);
  const storeById = new Map(featuredStores.map((store) => [store.id, store]));

  useEffect(() => {
    clearActiveStore();
  }, [clearActiveStore]);

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader publicMode />

      <main className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        <MobileShoppingTop categories={visibleCategories} />
        <div className="hidden sm:block">
          <LaunchStrip />
        </div>
        <CategoryRail categories={visibleCategories} />

        <section className="mt-4 hidden gap-4 sm:grid lg:grid-cols-[15rem_minmax(0,1fr)_16rem]">
          <CategoryMenu categories={sideCategories} />
          <ShoppingHero />
          <HomeSidePanels />
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Browse</p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
                Shop by category
              </h2>
            </div>
            <Link to="/categories" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          {categoriesLoading && liveCategories.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-32 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {visibleCategories.slice(0, 12).map((category) => (
                <Link
                  key={category.id}
                  to="/categories/$slug"
                  params={{ slug: category.slug }}
                  className="group text-center"
                >
                  <div className="mx-auto h-16 w-full max-w-28 transition-transform duration-200 group-hover:scale-105 sm:h-20">
                    <CategoryArtwork slug={category.slug} name={category.name} />
                  </div>
                  <span className="mt-2 block text-sm font-semibold leading-tight text-foreground group-hover:text-primary">
                    {category.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {category.productCount ?? 0}{" "}
                    {(category.productCount ?? 0) === 1 ? "product" : "products"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                Live marketplace
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
                Today's picks
              </h2>
            </div>
            <Link to="/marketplace" className="text-sm font-semibold text-primary hover:underline">
              See more
            </Link>
          </div>
          {productsLoading ? (
            <ProductGridSkeleton count={10} />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {featuredProducts.map((product) => {
                const store = storeById.get(product.storeId);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    {...(store ? { storeName: store.name, storeSlug: store.slug } : {})}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No products yet"
              description="Products from vendors will appear here as soon as they are available."
              action={
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Open marketplace <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          )}
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Stores</p>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
                Featured stores
              </h2>
            </div>
            <Link to="/stores" className="text-sm font-semibold text-primary hover:underline">
              Explore stores
            </Link>
          </div>
          {storesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-64 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : featuredStores.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No stores yet"
              description="Featured vendor stores will show here."
            />
          )}
        </section>

        <section className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/help/how-to", icon: ShoppingBag, label: "How to order" },
            { to: "/cart", icon: CreditCard, label: "Payment help" },
            { to: "/customer/orders", icon: Truck, label: "Track order" },
            { to: "/vendor-register", icon: Store, label: "Start selling" },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-3 rounded-xl bg-accent p-4 text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft hover:text-primary"
            >
              <item.icon className="h-5 w-5 text-primary" />
              {item.label}
            </Link>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function LaunchStrip() {
  const [activeAdvert, setActiveAdvert] = useState(0);
  const [activeNavItem, setActiveNavItem] = useState("home");
  const advert = advertSlides[activeAdvert];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveAdvert((current) => (current + 1) % advertSlides.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="overflow-hidden rounded-xl bg-[#123524] text-white shadow-card">
      <div
        className={`grid min-h-44 items-center gap-6 px-5 py-5 transition-colors duration-500 sm:grid-cols-[minmax(0,1fr)_13rem_auto] sm:px-7 ${advert.theme}`}
      >
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">
            {advert.eyebrow}
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-4xl font-bold leading-none tracking-tight">
            {advert.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/80">{advert.description}</p>
          <div className="mt-3 flex gap-1.5">
            {advertSlides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setActiveAdvert(index)}
                className={`h-1.5 rounded-full transition-all ${index === activeAdvert ? "w-6 bg-white" : "w-2 bg-white/45"}`}
                aria-label={`Show advert ${index + 1}`}
              />
            ))}
          </div>
        </div>
        <AdvertImage src={advert.images[0]} />
        <Link
          to={advert.to}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f7b733] px-5 py-3 text-sm font-bold text-[#123524] transition-transform hover:-translate-y-0.5"
        >
          {advert.button} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function MobileShoppingTop({
  categories,
}: {
  categories: Array<(typeof fallbackCategories)[number]>;
}) {
  const [activeAdvert, setActiveAdvert] = useState(0);
  const advert = advertSlides[activeAdvert];
  const mobileDeals = [
    { label: "Best prices", icon: ShoppingBag },
    { label: "Bulk drops", icon: Store },
    { label: "Fresh stores", icon: Sparkles },
    { label: "Save more", icon: Gem },
  ];

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveAdvert((current) => (current + 1) % advertSlides.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="sm:hidden">
      <Link
        to={advert.to}
        className={`flex min-h-14 items-center justify-between overflow-hidden rounded-xl px-3 py-2 text-white shadow-card transition-colors duration-500 ${advert.theme}`}
      >
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-none text-[#d8f7df]">
            {advert.eyebrow}
          </p>
          <p className="mt-1 line-clamp-1 text-[11px] font-medium text-white/75">{advert.title}</p>
        </div>
        <div className="flex -space-x-3">
          {advert.images.map((src) => (
            <span
              key={src}
              className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white shadow-sm"
            >
              <img src={src} alt="" className="h-[78%] w-[78%] object-contain" />
            </span>
          ))}
        </div>
        <span className="rounded-full bg-[#f7b733] px-3 py-1.5 text-xs font-bold text-[#123524]">
          {advert.button}
        </span>
      </Link>

      <nav className="-mx-3 mt-3 flex gap-5 overflow-x-auto border-y border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
        <Link
          to="/"
          onClick={() => setActiveNavItem("home")}
          className={`shrink-0 pb-2 transition-colors ${
            activeNavItem === "home"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Home
        </Link>
        {categories.slice(0, 10).map((category) => (
          <Link
            key={category.id}
            to="/categories/$slug"
            params={{ slug: category.slug }}
            onClick={() => setActiveNavItem(category.slug)}
            className={`shrink-0 pb-2 transition-colors ${
              activeNavItem === category.slug
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      <div className="-mx-3 bg-[#123524] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/85">
        Call to order: 07080635700 | WhatsApp: 12347016542481
      </div>

      <section className="mt-3">
        <Link
          to={advert.to}
          className="relative grid min-h-44 grid-cols-[minmax(0,1fr)_7.25rem] items-center gap-3 overflow-hidden rounded-xl bg-[#123524] p-4 text-white shadow-card"
        >
          <div className={`absolute inset-0 transition-colors duration-500 ${advert.theme}`} />
          <div className="relative min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/65">
              {advert.eyebrow}
            </p>
            <h1 className="mt-2 max-w-52 font-display text-[1.7rem] font-bold leading-none">
              {advert.title}
            </h1>
            <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#f7b733] px-3 py-2 text-xs font-bold text-[#123524]">
              {advert.button} <ArrowRight className="h-3 w-3" />
            </span>
            <div className="mt-3 flex gap-1.5">
              {advertSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveAdvert(index);
                  }}
                  className={`h-1.5 rounded-full transition-all ${index === activeAdvert ? "w-6 bg-white" : "w-2 bg-white/45"}`}
                  aria-label={`Show advert ${index + 1}`}
                />
              ))}
            </div>
          </div>
          <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-white shadow-frost">
            <img src={advert.images[0]} alt="" className="h-full w-full object-cover" />
          </span>
        </Link>
      </section>

      <section className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-card p-3 shadow-card">
        {mobileDeals.map((deal) => (
          <Link key={deal.label} to="/marketplace" className="text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#eef8f1] text-primary">
              <deal.icon className="h-6 w-6" />
            </div>
            <span className="mt-1 block text-[11px] font-semibold leading-tight text-foreground">
              {deal.label}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function AdvertImage({ src }: { src: string }) {
  return (
    <div className="hidden aspect-square w-full max-w-52 overflow-hidden rounded-2xl bg-white shadow-frost sm:block">
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

function CategoryRail({ categories }: { categories: Array<(typeof fallbackCategories)[number]> }) {
  return (
    <nav
      aria-label="Popular categories"
      className="mt-3 hidden gap-2 overflow-x-auto rounded-xl border border-border bg-card px-3 py-2 shadow-card sm:flex"
    >
      <Link
        to="/categories"
        className="flex shrink-0 items-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary"
      >
        <Menu className="h-4 w-4" />
        All Categories
      </Link>
      {categories.slice(0, 9).map((category) => (
        <Link
          key={category.id}
          to="/categories/$slug"
          params={{ slug: category.slug }}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-primary"
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}

function CategoryMenu({ categories }: { categories: Array<(typeof fallbackCategories)[number]> }) {
  return (
    <aside className="hidden rounded-xl border border-border bg-card p-2 shadow-card lg:block">
      {categories.map((category, index) => {
        const Icon = categoryIcons[index % categoryIcons.length];
        return (
          <Link
            key={category.id}
            to="/categories/$slug"
            params={{ slug: category.slug }}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="line-clamp-1">{category.name}</span>
          </Link>
        );
      })}
    </aside>
  );
}

function ShoppingHero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-[#123524] p-5 text-white shadow-card sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_83%_28%,rgba(247,183,51,0.28),transparent_24%),linear-gradient(125deg,rgba(18,53,36,0.98),rgba(18,130,60,0.9))]" />
      <div className="relative grid min-h-72 items-center gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">Shop smarter</p>
          <h2 className="mt-2 max-w-xl font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">
            Everything you need from sellers you can trust.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/82 sm:text-base">
            Search, compare, add to cart, and buy from verified Nigerian vendors in one place.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f7b733] px-5 py-3 text-sm font-bold text-[#123524]"
            >
              Start shopping <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/stores"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/12 px-5 py-3 text-sm font-bold text-white backdrop-blur"
            >
              Visit stores
            </Link>
          </div>
        </div>
        <div className="hidden h-64 lg:block">
          <div className="relative h-full">
            <div className="absolute left-2 top-10 grid h-36 w-28 -rotate-6 place-items-center rounded-2xl bg-white text-primary shadow-frost">
              <Smartphone className="h-14 w-14" />
            </div>
            <div className="absolute right-6 top-3 grid h-28 w-40 rotate-6 place-items-center rounded-2xl bg-white text-primary shadow-frost">
              <Shirt className="h-14 w-14" />
            </div>
            <div className="absolute bottom-2 right-24 grid h-32 w-36 -rotate-3 place-items-center rounded-2xl bg-white text-primary shadow-frost">
              <ShoppingBag className="h-14 w-14" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeSidePanels() {
  return (
    <aside className="hidden gap-4 lg:grid">
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-semibold text-foreground">Verified stores</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Shop from vendors with real storefronts and visible product listings.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <BadgeHelp className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-semibold text-foreground">Need help?</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Check how to order, pay, track delivery, and contact sellers.
        </p>
      </div>
    </aside>
  );
}
