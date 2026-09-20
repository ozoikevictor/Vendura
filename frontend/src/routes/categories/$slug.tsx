import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/shared/ProductCard";
import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { useQuery } from "@tanstack/react-query";
import { queryProducts } from "@/services/productService";
import { getCategoryBySlug } from "@/services/categoryService";
import { categories } from "@/data/categories";
import { stores } from "@/data/stores";
import { NotFoundError } from "@/services/_mock";
import { useStorefrontStore } from "@/store/storefront";
import { getStoreBySlug } from "@/services/storeService";

export const Route = createFileRoute("/categories/$slug")({
  head: ({ params }) => {
    const cat = categories.find((c) => c.slug === params.slug);
    return {
      meta: [
        { title: `${cat?.name ?? "Category"} — Vendura` },
        { name: "description", content: `Browse ${cat?.name ?? "products"} from verified vendors on Vendura.` },
        { property: "og:title", content: `${cat?.name ?? "Category"} — Vendura` },
        { property: "og:description", content: `Browse ${cat?.name ?? "products"} on Vendura.` },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CategoryDetailPage,
});

function CategoryDetailPage() {
  const { slug } = Route.useParams();
  const [subSlug, setSubSlug] = useState<string | undefined>(undefined);
  const activeStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);

  const { data: activeStore } = useQuery({
    queryKey: ["category-active-store", activeStoreSlug],
    queryFn: () => getStoreBySlug(activeStoreSlug!),
    enabled: Boolean(activeStoreSlug),
  });

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlug(slug),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["category-products", slug, subSlug, activeStore?.id],
    queryFn: () => queryProducts({ categorySlug: slug, ...(subSlug ? { subcategorySlug: subSlug } : {}), ...(activeStore ? { storeId: activeStore.id } : {}), pageSize: 48 }),
    enabled: !activeStoreSlug || Boolean(activeStore),
  });

  if (!category) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader publicMode={!activeStoreSlug} />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <EmptyState title="Category not found" description="This category doesn't exist." action={<Link to="/categories" className="text-sm font-semibold text-primary hover:underline">All categories</Link>} />
        </div>
        <SiteFooter />
      </div>
    );
  }

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader publicMode={!activeStoreSlug} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/categories" className="hover:text-primary">Categories</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{category.name}</span>
        </div>

        {/* Category header */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <CategoryIcon name={category.icon} className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{category.name}</h1>
            <p className="text-sm text-muted-foreground">{total} products</p>
          </div>
        </div>

        {/* Subcategory chips */}
        {category.subcategories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSubSlug(undefined)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${!subSlug ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-accent"}`}
            >
              All
            </button>
            {category.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubSlug(sub.slug)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${subSlug === sub.slug ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-accent"}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState title="No products in this category" description="Check back later or browse other categories." action={<Link to="/categories" className="text-sm font-semibold text-primary hover:underline">Browse categories</Link>} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.map((p) => {
                const store = activeStore ?? stores.find((s) => s.id === p.storeId);
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
      </div>

      <SiteFooter />
    </div>
  );
}
