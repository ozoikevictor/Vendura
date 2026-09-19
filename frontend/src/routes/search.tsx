import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useQuery } from "@tanstack/react-query";
import { queryProducts } from "@/services/productService";
import { stores } from "@/data/stores";
import type { ProductQuery } from "@/types";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Vendura" },
      { name: "description", content: "Search products from verified vendors across Nigeria." },
      { property: "og:title", content: "Search — Vendura" },
      { property: "og:description", content: "Search products on Vendura." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = useSearch({ strict: false }) as { q?: string };
  const q = search.q ?? "";
  const [sort, setSort] = useState<NonNullable<ProductQuery["sort"]>>("relevance");

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, sort],
    queryFn: () => queryProducts({ q, sort, pageSize: 48 }),
    enabled: q.length > 0,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/marketplace" className="hover:text-primary">Marketplace</Link>
            <span>/</span>
            <span className="text-foreground">Search</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
            {q ? `Results for "${q}"` : "Search"}
          </h1>
          {q && <p className="mt-1 text-sm text-muted-foreground">{total} {total === 1 ? "result" : "results"} found</p>}
        </div>

        {/* Sort bar */}
        {q && total > 0 && (
          <div className="mb-4 flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as NonNullable<ProductQuery["sort"]>)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        )}

        {/* Results */}
        {!q ? (
          <EmptyState
            title="Search for products"
            description="Use the search bar above to find products from verified vendors."
            icon={<SearchIcon className="h-8 w-8" />}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title={`No results for "${q}"`}
            description="Try a different search term or browse the marketplace."
            action={<Link to="/marketplace" className="text-sm font-semibold text-primary hover:underline">Browse marketplace</Link>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((p) => {
              const store = stores.find((s) => s.id === p.storeId);
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  {...(store ? { storeName: store.name, storeSlug: store.slug } : {})}
                />
              );
            })}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
