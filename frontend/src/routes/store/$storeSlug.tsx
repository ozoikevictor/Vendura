import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Flag,
  Heart,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Package,
  RotateCcw,
  ShieldCheck,
  Share2,
  Sparkles,
  Star,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/shared/ProductCard";
import { DataLoader } from "@/components/shared/DataLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RatingStars } from "@/components/shared/RatingStars";
import { useQuery } from "@tanstack/react-query";
import { getStoreBySlug } from "@/services/storeService";
import { getProductsByStore } from "@/services/productService";
import { startConversation } from "@/services/messageService";
import { useStorefrontStore } from "@/store/storefront";
import { cn } from "@/lib/utils";
import {
  breadcrumbJsonLd,
  canonicalLink,
  fetchPublicApi,
  seoMeta,
  truncateSeoText,
  jsonLdScript,
} from "@/lib/seo";
import type { Product, ProductReview, Store } from "@/types";

type StoreTab = "home" | "products" | "reviews" | "about" | "policies";

const tabs: Array<{ id: StoreTab; label: string }> = [
  { id: "home", label: "Home" },
  { id: "products", label: "Products" },
  { id: "reviews", label: "Reviews" },
  { id: "about", label: "About" },
  { id: "policies", label: "Policies" },
];

export const Route = createFileRoute("/store/$storeSlug")({
  loader: async ({ params }) => {
    const storefront = await fetchPublicApi<{ store: Store; products: Product[] }>(
      `/storefronts/${encodeURIComponent(params.storeSlug)}`,
    );
    return {
      store:
        storefront?.store ??
        (await fetchPublicApi<Store>(`/stores/slug/${encodeURIComponent(params.storeSlug)}`)),
      products: storefront?.products ?? [],
    };
  },
  head: ({ params, loaderData }) => {
    const store = loaderData?.store;
    const path = `/store/${params.storeSlug}`;
    const title = store ? `${store.name} | Shop on Vendraza` : "Store | Vendraza";
    const description = store
      ? truncateSeoText(
          `${store.description} Shop products from ${store.name} on Vendraza in ${store.location.city}, ${store.location.state}.`,
        )
      : "Discover vendor stores and shop products on Vendraza.";
    return {
      meta: seoMeta({
        title,
        description,
        path,
        image: store?.bannerUrl ?? store?.logoUrl,
        robots: store ? "index, follow" : "noindex, follow",
      }),
      links: canonicalLink(path),
      scripts: store
        ? [
            jsonLdScript({
              "@context": "https://schema.org",
              "@type": "Store",
              name: store.name,
              description: store.description,
              url: `https://vendraza.com${path}`,
              image: store.bannerUrl ?? store.logoUrl,
              address: {
                "@type": "PostalAddress",
                addressLocality: store.location.city,
                addressRegion: store.location.state,
                addressCountry: "NG",
              },
            }),
            jsonLdScript(
              breadcrumbJsonLd([
                { name: "Home", path: "/" },
                { name: "Stores", path: "/stores" },
                { name: store.name, path },
              ]),
            ),
          ]
        : [],
    };
  },
  component: StorePage,
});

function StorePage() {
  const { storeSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate();
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<StoreTab>("home");
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const setActiveStore = useStorefrontStore((state) => state.setActiveStore);

  const { data: liveStore, isLoading: storeLoading } = useQuery({
    queryKey: ["store", storeSlug],
    queryFn: () => getStoreBySlug(storeSlug),
  });
  const store = liveStore ?? loaderData.store;

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["store-products", storeSlug],
    queryFn: () => (store ? getProductsByStore(store.id) : Promise.resolve([])),
    enabled: !!store,
  });

  const productList = useMemo(
    () => (products && products.length > 0 ? products : loaderData.products),
    [loaderData.products, products],
  );
  const initials = getStoreInitials(store?.name ?? storeSlug);
  const storefrontUrl = getStorefrontUrl(storeSlug);
  const reviews = useMemo(() => getStoreReviews(productList), [productList]);
  const featuredProducts = useMemo(
    () =>
      [...productList]
        .sort(
          (a, b) =>
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
            Number(b.soldCount) - Number(a.soldCount) ||
            Number(b.rating) - Number(a.rating),
        )
        .slice(0, 4),
    [productList],
  );
  const newProducts = useMemo(
    () =>
      [...productList].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 4),
    [productList],
  );
  const categoryCount = useMemo(
    () => new Set(productList.map((product) => product.categoryId)).size,
    [productList],
  );

  useEffect(() => {
    setActiveStore(storeSlug);
  }, [setActiveStore, storeSlug]);

  useEffect(() => {
    if (!store) return;
    document.title = `${store.name} - Vendraza`;
    setBannerFailed(false);
    setLogoFailed(false);
    setMoreOpen(false);
    setExpandedDescription(false);
    setFollowed(window.localStorage.getItem(getFollowKey(store.id)) === "true");
  }, [store]);

  if (!store && storeLoading) {
    return (
      <div className="flex min-h-screen flex-col lagoon-wash">
        <MarketplaceHeader />
        <DataLoader label="Loading storefront" className="min-h-[65dvh] flex-1" />
        <SiteFooter />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-screen flex-col lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <EmptyState
            title="Store not found"
            description="This store doesn't exist or has been removed."
            action={
              <Link
                to="/marketplace"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Browse marketplace
              </Link>
            }
          />
        </div>
        <SiteFooter />
      </div>
    );
  }

  const displayedFollowers = store.followers + (followed ? 1 : 0);
  const shortDescription =
    store.description.length > 180 && !expandedDescription
      ? `${store.description.slice(0, 180).trim()}...`
      : store.description;

  function toggleFollow() {
    if (!store) return;
    const next = !followed;
    setFollowed(next);
    window.localStorage.setItem(getFollowKey(store.id), String(next));
    toast.success(next ? `Following ${store.name}` : `Unfollowed ${store.name}`);
  }

  async function copyStoreLink() {
    await navigator.clipboard.writeText(storefrontUrl);
    setMoreOpen(false);
    toast.success("Store link copied");
  }

  async function shareStore() {
    const payload = {
      title: `${store.name} on Vendraza`,
      text: `Shop ${store.name} on Vendraza`,
      url: storefrontUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        return;
      }
    }
    await copyStoreLink();
  }

  async function messageStore() {
    if (startingConversation) return;
    const product = productList[0];
    if (!product) {
      toast.error("This store needs a product before messages can start.");
      return;
    }
    setStartingConversation(true);
    try {
      const conversation = await startConversation(product.id);
      navigate({ to: "/messages/$conversationId", params: { conversationId: conversation.id } });
    } catch {
      toast.error("Please log in as a customer to message this store.");
    } finally {
      setStartingConversation(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative -mx-4 sm:mx-0">
          <div className="relative h-52 overflow-hidden bg-emerald-950 sm:h-72 sm:rounded-[2rem] sm:shadow-frost lg:h-[21rem]">
            {store.bannerUrl && !bannerFailed ? (
              <img
                src={store.bannerUrl}
                onError={() => setBannerFailed(true)}
                alt={`${store.name} store banner`}
                className="h-full w-full object-cover"
              />
            ) : (
              <InitialsBanner initials={initials} storeName={store.name} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/65 via-emerald-950/10 to-transparent" />
            {store.verified && (
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/90 px-3 py-2 text-xs font-bold text-emerald-800 shadow-lg backdrop-blur sm:left-7 sm:top-7">
                <ShieldCheck className="h-4 w-4" />
                Trusted Store
              </div>
            )}
            <div className="pointer-events-none absolute -bottom-16 left-[-8%] h-32 w-[116%] rounded-[50%] bg-background" />
          </div>

          <div className="relative px-4 pb-2 pt-0 sm:px-2 lg:px-3">
            <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end">
              <StoreAvatar
                storeName={store.name}
                initials={initials}
                logoUrl={store.logoUrl}
                logoFailed={logoFailed}
                onLogoFailed={() => setLogoFailed(true)}
              />
              <div className="min-w-0 flex-1 pt-1 sm:pb-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                        {store.name}
                      </h1>
                      {store.verified && <VerifiedBadge />}
                    </div>
                    {store.tagline && (
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {store.tagline}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <RatingStars rating={store.rating} size={14} showValue />
                      <span>{store.reviewCount} reviews</span>
                      <span>{store.productCount} products</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4 text-primary" />{" "}
                        {displayedFollowers.toLocaleString()} followers
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-primary" /> {store.location.city},{" "}
                        {store.location.state}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={toggleFollow}
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-card transition hover:-translate-y-0.5 hover:border-primary/30",
                        followed && "border-primary bg-primary text-primary-foreground",
                      )}
                      aria-label={followed ? "Unfollow store" : "Follow store"}
                    >
                      <Heart className={cn("h-5 w-5", followed && "fill-current")} />
                    </button>
                    <button
                      type="button"
                      onClick={shareStore}
                      className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-card transition hover:-translate-y-0.5 hover:border-primary/30"
                      aria-label="Share store"
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setMoreOpen((current) => !current)}
                        className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-card transition hover:-translate-y-0.5 hover:border-primary/30"
                        aria-label="More store actions"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      {moreOpen && (
                        <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card p-1 text-sm shadow-frost">
                          <button
                            type="button"
                            onClick={copyStoreLink}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-accent"
                          >
                            <Copy className="h-4 w-4" /> Copy Store Link
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMoreOpen(false);
                              toast.info("Thanks. Store reporting will open from support soon.");
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <Flag className="h-4 w-4" /> Report Store
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
              <div>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {shortDescription}
                </p>
                {store.description.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setExpandedDescription((current) => !current)}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    {expandedDescription ? "Show less" : "Read more"}{" "}
                    <ChevronDown
                      className={cn("h-4 w-4 transition", expandedDescription && "rotate-180")}
                    />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-primary/10 bg-primary-soft/40 p-3 text-xs font-semibold text-emerald-950 sm:grid-cols-4 lg:grid-cols-2">
                <Benefit icon={<Truck />} label="Fast Shipping" />
                <Benefit icon={<ShieldCheck />} label="Secure Payments" />
                <Benefit icon={<Package />} label="Easy Returns" />
                <Benefit icon={<MessageSquare />} label="Support" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={messageStore}
                disabled={startingConversation}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
              >
                <MessageSquare className="h-4 w-4" />
                {startingConversation ? "Opening..." : "Message Store"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-bold text-foreground transition hover:bg-accent"
              >
                View Products <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <nav className="sticky top-[4.5rem] z-10 mt-5 overflow-x-auto border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex min-w-max gap-6 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative py-4 text-sm font-bold text-muted-foreground transition hover:text-foreground",
                  activeTab === tab.id && "text-primary",
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute inset-x-0 bottom-0 h-1 rounded-t-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </nav>

        <section className="py-6">
          {activeTab === "home" && (
            <HomeTab
              store={store}
              categoryCount={categoryCount}
              featuredProducts={featuredProducts}
              newProducts={newProducts}
              productsLoading={productsLoading && productList.length === 0}
              onViewProducts={() => setActiveTab("products")}
            />
          )}
          {activeTab === "products" && (
            <ProductsTab
              store={store}
              products={productList}
              productsLoading={productsLoading && productList.length === 0}
            />
          )}
          {activeTab === "reviews" && <ReviewsTab store={store} reviews={reviews} />}
          {activeTab === "about" && <AboutTab store={store} categoryCount={categoryCount} />}
          {activeTab === "policies" && <PoliciesTab store={store} />}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function getStoreInitials(storeName: string) {
  const ignore = new Set([
    "and",
    "the",
    "store",
    "shop",
    "limited",
    "ltd",
    "enterprise",
    "enterprises",
  ]);
  const words = storeName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = words.filter((word) => !ignore.has(word.toLowerCase()));
  const source = meaningful.length > 0 ? meaningful : words;
  const initials = source
    .slice(0, source.length === 1 ? 2 : 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  if (initials.length >= 2) return initials.slice(0, 3);
  return (storeName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "VR").toUpperCase();
}

function InitialsBanner({ initials, storeName }: { initials: string; storeName: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(164,255,201,0.38),transparent_28%),linear-gradient(135deg,#052e1b_0%,#0f6b3a_47%,#b7f7ce_100%)]">
      <div className="absolute -left-16 bottom-[-45%] h-72 w-96 rotate-[-14deg] rounded-[45%] bg-white/12 blur-sm" />
      <div className="absolute right-[-8%] top-[-38%] h-96 w-96 rounded-[42%] bg-emerald-200/28 blur-[1px]" />
      <div className="absolute bottom-[-30%] right-[18%] h-72 w-72 rounded-[40%] border border-white/18 bg-emerald-950/20" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-emerald-950/45 to-transparent" />
      <div className="relative text-center text-white drop-shadow">
        <div className="font-display text-7xl font-black leading-none sm:text-8xl lg:text-9xl">
          {initials}
        </div>
        <div className="mt-3 text-sm font-bold uppercase tracking-[0.28em] text-emerald-50/90 sm:text-base">
          {storeName}
        </div>
      </div>
    </div>
  );
}

function StoreAvatar({
  storeName,
  initials,
  logoUrl,
  logoFailed,
  onLogoFailed,
}: {
  storeName: string;
  initials: string;
  logoUrl?: string;
  logoFailed: boolean;
  onLogoFailed: () => void;
}) {
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.7rem] border-[6px] border-background bg-gradient-to-br from-emerald-800 to-primary text-3xl font-black text-white shadow-frost sm:h-36 sm:w-36">
      {logoUrl && !logoFailed ? (
        <img
          src={logoUrl}
          onError={onLogoFailed}
          alt={`${storeName} logo`}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
      <ShieldCheck className="h-3.5 w-3.5" /> Verified
    </span>
  );
}

function Benefit({ icon, label }: { icon: React.ReactElement; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/65 p-2.5 shadow-sm">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}

function HomeTab({
  store,
  categoryCount,
  featuredProducts,
  newProducts,
  productsLoading,
  onViewProducts,
}: {
  store: Store;
  categoryCount: number;
  featuredProducts: Product[];
  newProducts: Product[];
  productsLoading: boolean;
  onViewProducts: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={<Package />} label="Products" value={store.productCount.toLocaleString()} />
        <Metric icon={<Star />} label="Rating" value={store.rating.toFixed(1)} />
        <Metric icon={<Sparkles />} label="Categories" value={String(categoryCount)} />
      </div>

      <ProductSection
        title="Featured products"
        products={featuredProducts}
        store={store}
        loading={productsLoading}
        emptyTitle="No featured products yet"
        action={onViewProducts}
      />

      <ProductSection
        title="New arrivals"
        products={newProducts}
        store={store}
        loading={productsLoading}
        emptyTitle="No new arrivals yet"
        action={onViewProducts}
      />
    </div>
  );
}

function ProductsTab({
  store,
  products,
  productsLoading,
}: {
  store: Store;
  products: Product[];
  productsLoading: boolean;
}) {
  if (productsLoading) return <DataLoader label="Loading store products" className="min-h-72" />;
  if (products.length === 0) {
    return (
      <EmptyState title="No products yet" description="This store hasn't listed any products." />
    );
  }
  return (
    <div
      id="store-products"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          storeName={store.name}
          storeSlug={store.slug}
        />
      ))}
    </div>
  );
}

function ReviewsTab({ store, reviews }: { store: Store; reviews: ProductReview[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-muted-foreground">Store rating</p>
        <div className="mt-2 flex items-end gap-2">
          <span className="font-display text-5xl font-black">{store.rating.toFixed(1)}</span>
          <span className="pb-2 text-sm text-muted-foreground">/ 5</span>
        </div>
        <div className="mt-3">
          <RatingStars rating={store.rating} size={16} count={store.reviewCount} />
        </div>
      </div>
      {reviews.length === 0 ? (
        <EmptyState
          title="No written reviews yet"
          description="Verified product reviews for this store will appear here."
        />
      ) : (
        <div className="grid gap-3">
          {reviews.slice(0, 6).map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-foreground">{review.customerName}</p>
                  <RatingStars rating={review.rating} size={13} />
                </div>
                {review.verifiedPurchase && (
                  <span className="rounded-full bg-primary-soft px-2 py-1 text-xs font-bold text-primary">
                    Verified purchase
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.comment}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AboutTab({ store, categoryCount }: { store: Store; categoryCount: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">About {store.name}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{store.description}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">Store details</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <InfoRow label="Location" value={`${store.location.city}, ${store.location.state}`} />
          <InfoRow label="Products" value={store.productCount.toLocaleString()} />
          <InfoRow label="Categories" value={String(categoryCount)} />
          <InfoRow label="Joined" value={new Date(store.joinedAt).toLocaleDateString()} />
          {store.contact.email && <InfoRow label="Email" value={store.contact.email} />}
          {store.contact.phone && <InfoRow label="Phone" value={store.contact.phone} />}
        </dl>
      </div>
    </div>
  );
}

function PoliciesTab({ store }: { store: Store }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <PolicyCard icon={<Truck />} title="Shipping" body={store.policies.shipping} />
      <PolicyCard icon={<RotateCcw />} title="Returns & refunds" body={store.policies.returns} />
      <PolicyCard
        icon={<WalletCards />}
        title="Secure checkout"
        body={
          store.policies.warranty ??
          "Payments are protected through Vendraza checkout and order tracking."
        }
      />
    </div>
  );
}

function ProductSection({
  title,
  products,
  store,
  loading,
  emptyTitle,
  action,
}: {
  title: string;
  products: Product[];
  store: Store;
  loading: boolean;
  emptyTitle: string;
  action: () => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <button
          type="button"
          onClick={action}
          className="text-sm font-bold text-primary hover:underline"
        >
          View all
        </button>
      </div>
      {loading ? (
        <DataLoader label={`Loading ${title.toLowerCase()}`} className="min-h-56" />
      ) : products.length === 0 ? (
        <EmptyState title={emptyTitle} description="Check back soon for more from this store." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              storeName={store.name}
              storeSlug={store.slug}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <p className="font-display text-2xl font-black text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function PolicyCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactElement;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function getStoreReviews(products: Product[]) {
  return products
    .flatMap((product) => (product as Product & { reviews?: ProductReview[] }).reviews ?? [])
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function getStorefrontUrl(storeSlug: string) {
  if (typeof window === "undefined") return `https://vendraza.com/store/${storeSlug}`;
  return `${window.location.origin}/store/${storeSlug}`;
}

function getFollowKey(storeId: string) {
  return `vendraza-follow-store:${storeId}`;
}
