import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck, MapPin, Package, Star, Truck, RotateCcw,
} from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/shared/ProductCard";
import { DataLoader } from "@/components/shared/DataLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RatingStars } from "@/components/shared/RatingStars";
import { useQuery } from "@tanstack/react-query";
import { getStoreBySlug } from "@/services/storeService";
import { getProductsByStore } from "@/services/productService";
import { products as allProducts } from "@/data/products";
import { formatNaira } from "@/utils/format";
import fallbackBanner from "@/assets/store-banner-1.jpg";
import { useStorefrontStore } from "@/store/storefront";

export const Route = createFileRoute("/store/$storeSlug")({
  head: ({ params }) => ({
    meta: [
      { title: "Store — Vendura" },
      { name: "description", content: "View this store on Vendura." },
      { property: "og:title", content: "Store — Vendura" },
      { property: "og:description", content: "View this store on Vendura." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const { storeSlug } = Route.useParams();
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const setActiveStore = useStorefrontStore((state) => state.setActiveStore);

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["store", storeSlug],
    queryFn: () => getStoreBySlug(storeSlug),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["store-products", storeSlug],
    queryFn: () => store ? getProductsByStore(store.id) : Promise.resolve([]),
    enabled: !!store,
  });

  useEffect(() => {
    setActiveStore(storeSlug);
  }, [setActiveStore, storeSlug]);

  useEffect(() => {
    if (!store) return;
    document.title = `${store.name} - Vendura`;
    setBannerFailed(false);
    setLogoFailed(false);
  }, [store]);

  if (storeLoading) {
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
          <EmptyState title="Store not found" description="This store doesn't exist or has been removed." action={<Link to="/marketplace" className="text-sm font-semibold text-primary hover:underline">Browse marketplace</Link>} />
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader />

      {/* Banner */}
      <div className="relative h-40 overflow-hidden sm:h-56">
        <img src={!bannerFailed && store.bannerUrl ? store.bannerUrl : fallbackBanner} onError={() => setBannerFailed(true)} alt={`${store.name} banner`} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
        {/* Store header */}
        <div className="relative -mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-background bg-primary-soft text-2xl font-bold text-primary shadow-card sm:h-24 sm:w-24">
            {store.logoUrl && !logoFailed ? (
              <img src={store.logoUrl} onError={() => setLogoFailed(true)} alt={`${store.name} logo`} className="h-full w-full object-cover" />
            ) : store.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">{store.name}</h1>
              {store.verified && (
                <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            {store.tagline && <p className="mt-0.5 text-sm text-muted-foreground">{store.tagline}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <RatingStars rating={store.rating} size={12} showValue />
              <span>· {store.reviewCount} reviews</span>
              <span>· {store.productCount} products</span>
              <span>· {store.followers} followers</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {store.location.city}, {store.location.state}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{store.description}</p>

        {/* Policies */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Shipping</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{store.policies.shipping}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">Returns</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{store.policies.returns}</p>
            </div>
          </div>
          {store.policies.warranty && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">Warranty</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{store.policies.warranty}</p>
              </div>
            </div>
          )}
        </div>

        {/* Products */}
        <div id="store-products" className="mt-8 scroll-mt-28">
          <h2 className="font-display text-lg font-bold text-foreground">Products</h2>
          {productsLoading ? (
            <DataLoader label="Loading store products" className="min-h-72" />
          ) : !products || products.length === 0 ? (
            <EmptyState title="No products yet" description="This store hasn't listed any products." />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} storeName={store.name} storeSlug={store.slug} />
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
