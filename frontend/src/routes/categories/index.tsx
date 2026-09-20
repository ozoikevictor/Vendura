import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { categories } from "@/data/categories";
import { formatNaira } from "@/utils/format";
import { useStorefrontStore } from "@/store/storefront";
import { useQuery } from "@tanstack/react-query";
import { getStoreBySlug } from "@/services/storeService";
import { getProductsByStore } from "@/services/productService";
import { getCategories } from "@/services/categoryService";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: [
      { title: "All Categories — Vendura" },
      { name: "description", content: "Browse all product categories on Vendura — phones, fashion, building materials, and more." },
      { property: "og:title", content: "All Categories — Vendura" },
      { property: "og:description", content: "Browse all product categories on Vendura." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const activeStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);
  const { data: store } = useQuery({
    queryKey: ["category-store", activeStoreSlug],
    queryFn: () => getStoreBySlug(activeStoreSlug!),
    enabled: Boolean(activeStoreSlug),
  });
  const { data: apiCategories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const { data: storeProducts = [] } = useQuery({
    queryKey: ["category-store-products", store?.id],
    queryFn: () => getProductsByStore(store!.id),
    enabled: Boolean(store),
  });
  const catalogCategories = apiCategories?.length ? apiCategories : categories;
  const categoryCounts = new Map<string, number>();
  storeProducts.forEach((product) => categoryCounts.set(product.categoryId, (categoryCounts.get(product.categoryId) ?? 0) + 1));
  const visibleCategories = activeStoreSlug
    ? catalogCategories.filter((category) => categoryCounts.has(category.id))
    : catalogCategories;

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader publicMode={!activeStoreSlug} />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Browse"
          title={store ? `${store.name} Categories` : "All Categories"}
          description={store ? `Browse products by category inside ${store.name}.` : "Shop across categories from trusted Nigerian sellers."}
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visibleCategories.map((c) => (
            <Link
              key={c.id}
              to="/categories/$slug"
              params={{ slug: c.slug }}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-frost hover:border-primary/30"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <CategoryIcon name={c.icon} className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{c.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeStoreSlug ? `${categoryCounts.get(c.id) ?? 0} products` : `${c.subcategories.length} subcategories · ${formatNaira(c.productCount, { compact: true })} products`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
