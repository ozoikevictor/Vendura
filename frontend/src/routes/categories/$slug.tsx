import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/shared/ProductCard";
import { DataLoader } from "@/components/shared/DataLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { useQuery } from "@tanstack/react-query";
import { queryProducts } from "@/services/productService";
import { getCategoryBySlug } from "@/services/categoryService";
import { categories } from "@/data/categories";
import { getStores } from "@/services/storeService";
import { breadcrumbJsonLd, canonicalLink, fetchPublicApi, seoMeta, jsonLdScript } from "@/lib/seo";
import type { Category } from "@/types";

export const Route = createFileRoute("/categories/$slug")({
  loader: async ({ params }) => ({
    category: await fetchPublicApi<Category>(`/categories/${encodeURIComponent(params.slug)}`),
  }),
  head: ({ params, loaderData }) => {
    const cat = loaderData?.category ?? categories.find((c) => c.slug === params.slug);
    const title = cat ? `${cat.name} Marketplace | Vendraza` : "Shop by Category | Vendraza";
    const description = cat?.description
      ? `${cat.description} Shop ${cat.name} products from vendors on Vendraza.`
      : `Browse ${cat?.name ?? "products"} from vendors on Vendraza.`;
    const path = `/categories/${params.slug}`;
    return {
      meta: seoMeta({
        title,
        description,
        path,
        robots: cat ? "index, follow" : "noindex, follow",
      }),
      links: canonicalLink(path),
      scripts: cat
        ? [
            jsonLdScript(
              breadcrumbJsonLd([
                { name: "Home", path: "/" },
                { name: "Categories", path: "/categories" },
                { name: cat.name, path },
              ]),
            ),
          ]
        : [],
    };
  },
  component: CategoryDetailPage,
});

function CategoryDetailPage() {
  const { slug } = Route.useParams();
  const [subSlug, setSubSlug] = useState<string | undefined>(undefined);

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlug(slug),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["category-products", slug, subSlug],
    queryFn: () =>
      queryProducts({
        categorySlug: slug,
        ...(subSlug ? { subcategorySlug: subSlug } : {}),
        pageSize: 48,
      }),
  });

  const { data: storeList = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: getStores,
  });
  const storeById = useMemo(
    () => new Map(storeList.map((store) => [store.id, store])),
    [storeList],
  );

  if (!category) {
    return (
      <div className="flex min-h-screen flex-col lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <EmptyState
            title="Category not found"
            description="This category doesn't exist."
            action={
              <Link to="/categories" className="text-sm font-semibold text-primary hover:underline">
                All categories
              </Link>
            }
          />
        </div>
        <SiteFooter />
      </div>
    );
  }

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/categories" className="hover:text-primary">
            Categories
          </Link>
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
            <DataLoader label="Loading category products" className="min-h-80" />
          ) : products.length === 0 ? (
            <EmptyState
              title="No products in this category"
              description="Check back later or browse other categories."
              action={
                <Link
                  to="/categories"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Browse categories
                </Link>
              }
            />
          ) : (
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
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
