import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBasket } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductCard } from "@/components/shared/ProductCard";
import { useWishlistStore } from "@/store/wishlist";
import { products as demoProducts } from "@/data/products";
import { stores } from "@/data/stores";
import { useStorefrontStore } from "@/store/storefront";
import { useQuery } from "@tanstack/react-query";
import { getStoreBySlug } from "@/services/storeService";
import { getProductsByStore } from "@/services/productService";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Vendura" },
      { name: "description", content: "Your saved items on Vendura." },
      { property: "og:title", content: "Wishlist — Vendura" },
      { property: "og:description", content: "Your saved items on Vendura." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const wishlist = useWishlistStore();
  const activeStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);
  const { data: storefrontProducts = [] } = useQuery({
    queryKey: ["wishlist-store-products", activeStoreSlug],
    queryFn: async () => {
      const store = await getStoreBySlug(activeStoreSlug!);
      return store ? getProductsByStore(store.id) : [];
    },
    enabled: Boolean(activeStoreSlug),
  });
  const catalog = activeStoreSlug ? storefrontProducts : demoProducts;
  const items = catalog.filter((p) => wishlist.has(p.id));

  const browseAction = activeStoreSlug ? (
    <Link to="/store/$storeSlug" params={{ storeSlug: activeStoreSlug }} hash="store-products" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse this store</Link>
  ) : (
    <Link to="/marketplace" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse Marketplace</Link>
  );

  if (items.length === 0) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <EmptyState
          icon={<Heart className="h-7 w-7" />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          action={browseAction}
        />
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Wishlist</h1>
          <button onClick={() => wishlist.clear()} className="text-sm text-muted-foreground hover:text-foreground">Clear all</button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {items.map((p) => {
            const s = activeStoreSlug ? undefined : stores.find((st) => st.id === p.storeId);
            return <ProductCard key={p.id} product={p} {...(activeStoreSlug ? { storeSlug: activeStoreSlug } : s ? { storeName: s.name, storeSlug: s.slug } : {})} />;
          })}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
