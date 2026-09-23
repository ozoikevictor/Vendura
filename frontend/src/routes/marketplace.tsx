import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/shared/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/categoryService";
import type { ProductQuery } from "@/types";
import { getStores } from "@/services/storeService";
import { queryProducts } from "@/services/productService";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Vendura" },
      {
        name: "description",
        content: "Browse thousands of products from verified vendors across Nigeria.",
      },
      { property: "og:title", content: "Marketplace — Vendura" },
      {
        property: "og:description",
        content: "Browse products from verified vendors across Nigeria.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketplacePage,
});

const SORTS: { value: NonNullable<ProductQuery["sort"]>; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
  { value: "popular", label: "Most Popular" },
];

function MarketplacePage() {
  const [query, setQuery] = useState<ProductQuery>({ page: 1, pageSize: 24 });
  const [showFilters, setShowFilters] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: storeList = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: getStores,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["products", query],
    queryFn: () => queryProducts(query),
  });
  const catalogCategories = categories ?? [];
  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const storeById = useMemo(
    () => new Map(storeList.map((store) => [store.id, store])),
    [storeList],
  );

  function update(patch: Record<string, unknown>) {
    setQuery((q) => {
      const next: ProductQuery = { ...q, page: 1 };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === false || v === "") {
          delete (next as Record<string, unknown>)[k];
        } else {
          (next as Record<string, unknown>)[k] = v;
        }
      }
      return next;
    });
  }

  function changePage(page: number) {
    setQuery((current) => ({ ...current, page }));
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader />

      <main
        ref={contentRef}
        className="mx-auto w-full max-w-7xl flex-1 scroll-mt-4 px-4 py-6 sm:px-6 lg:px-8"
      >
        <SectionHeader
          eyebrow="Shop across Vendura"
          title="Marketplace"
          description={`${total} products from ${storeList.length} independent ${storeList.length === 1 ? "vendor" : "vendors"}`}
        />

        <section className="mt-6" aria-labelledby="marketplace-categories">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2
              id="marketplace-categories"
              className="font-display text-lg font-bold text-foreground"
            >
              Shop by category
            </h2>
            <Link to="/categories" className="text-sm font-semibold text-primary hover:underline">
              View all categories
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {catalogCategories.slice(0, 12).map((category) => (
              <Link
                key={category.id}
                to="/categories/$slug"
                params={{ slug: category.slug }}
                className="min-h-20 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary hover:bg-primary-soft"
              >
                <p className="text-sm font-semibold text-foreground">{category.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {category.productCount} products
                </p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-6 lg:flex-row">
          {/* Sidebar filters */}
          <aside
            className={`${showFilters ? "fixed inset-0 z-50 overflow-y-auto bg-background lg:static lg:z-auto lg:w-64 lg:shrink-0" : "hidden lg:block"}`}
          >
            <div className="rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4">
              <div className="mb-4 flex items-center justify-between lg:hidden">
                <h2 className="text-base font-semibold text-foreground">Filters</h2>
                <button onClick={() => setShowFilters(false)} aria-label="Close filters">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              {/* Category filter */}
              <div className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => update({ categorySlug: undefined })}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${!query.categorySlug ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-accent"}`}
                  >
                    All categories
                  </button>
                  {catalogCategories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => update({ categorySlug: c.slug })}
                      className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${query.categorySlug === c.slug ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-accent"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div className="mb-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Price range
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={query.minPrice ?? ""}
                    onChange={(e) =>
                      update({ minPrice: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={query.maxPrice ?? ""}
                    onChange={(e) =>
                      update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={query.negotiableOnly ?? false}
                    onChange={(e) => update({ negotiableOnly: e.target.checked || undefined })}
                    className="rounded border-input"
                  />
                  Negotiable only
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={query.inStockOnly ?? false}
                    onChange={(e) => update({ inStockOnly: e.target.checked || undefined })}
                    className="rounded border-input"
                  />
                  In stock only
                </label>
              </div>

              <button
                onClick={() => setQuery({ page: 1, pageSize: 24 })}
                className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Clear all
              </button>
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1">
            {/* Sort bar */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <select
                  value={query.sort ?? "relevance"}
                  onChange={(e) => update({ sort: e.target.value as ProductQuery["sort"] })}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-72 animate-pulse rounded-xl border border-border bg-card"
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Vendor products will appear here as sellers publish them."
                action={
                  <Link
                    to="/marketplace"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Clear filters
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {products.map((p) => {
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => changePage((query.page ?? 1) - 1)}
                      disabled={(query.page ?? 1) <= 1}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground disabled:opacity-40 hover:bg-accent"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {query.page ?? 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => changePage((query.page ?? 1) + 1)}
                      disabled={(query.page ?? 1) >= totalPages}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground disabled:opacity-40 hover:bg-accent"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
