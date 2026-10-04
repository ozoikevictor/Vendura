import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingBasket } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductCard } from "@/components/shared/ProductCard";
import { useWishlistStore } from "@/store/wishlist";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getStores } from "@/services/storeService";
import { queryProducts } from "@/services/productService";
import { clearWishlistItems, getWishlistIds } from "@/services/engagementService";
import { useAuthStore } from "@/store/auth";
import { useEffect, useMemo, useState } from "react";
import { noindexMeta } from "@/lib/seo";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: noindexMeta("Wishlist | Vendraza", "Your saved items on Vendraza."),
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const ids = useWishlistStore((state) => state.ids);
  const hasWishlistItem = useWishlistStore((state) => state.has);
  const setWishlistIds = useWishlistStore((state) => state.setIds);
  const clearLocalWishlist = useWishlistStore((state) => state.clear);
  const user = useAuthStore((state) => state.user);
  const [clearing, setClearing] = useState(false);
  const { data: savedWishlistIds } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: getWishlistIds,
    enabled: !!user,
  });
  const { data: productResult } = useQuery({
    queryKey: ["wishlist-marketplace-products"],
    queryFn: () => queryProducts({ pageSize: 100 }),
  });
  const { data: stores = [] } = useQuery({ queryKey: ["stores"], queryFn: getStores });
  const storeById = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const items = (productResult?.items ?? []).filter((product) => hasWishlistItem(product.id));

  useEffect(() => {
    if (savedWishlistIds) setWishlistIds(savedWishlistIds);
  }, [savedWishlistIds, setWishlistIds]);

  async function clearWishlist() {
    if (!user) {
      clearLocalWishlist();
      return;
    }
    setClearing(true);
    try {
      const ids = await clearWishlistItems();
      setWishlistIds(ids);
      toast.success("Wishlist cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear wishlist");
    } finally {
      setClearing(false);
    }
  }

  const browseAction = (
    <Link
      to="/marketplace"
      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
    >
      Browse Marketplace
    </Link>
  );

  if (ids.length === 0 || items.length === 0) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <EmptyState
          icon={<Heart className="h-7 w-7" />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          action={browseAction}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Wishlist</h1>
          <button
            onClick={() => void clearWishlist()}
            disabled={clearing}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {clearing ? "Clearing..." : "Clear all"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {items.map((p) => {
            const store = storeById.get(p.storeId);
            return (
              <ProductCard
                key={p.id}
                product={p}
                {...(store ? { storeName: store.name, storeSlug: store.slug } : {})}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
