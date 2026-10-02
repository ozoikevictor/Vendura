import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/categoryService";
import { categories as fallbackCategories } from "@/data/categories";
import { canonicalLink, seoMeta } from "@/lib/seo";
import { getCategoryVisual } from "@/utils/categoryVisuals";
import type { Category } from "@/types";

export const Route = createFileRoute("/categories/")({
  head: () => ({
    meta: seoMeta({
      title: "Shop by Category | Vendraza",
      description:
        "Browse Vendraza product categories including electronics, fashion, beauty, home goods, automotive items, and building materials.",
      path: "/categories",
    }),
    links: canonicalLink("/categories"),
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: apiCategories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const catalogCategories = mergeCategoryList(apiCategories);

  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Browse"
          title="All Categories"
          description="Shop across categories from trusted Nigerian sellers."
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {catalogCategories.map((c) => (
            <Link key={c.id} to="/categories/$slug" params={{ slug: c.slug }} className="group">
              <article className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-frost">
                <div
                  className="relative aspect-[4/3] overflow-hidden bg-muted"
                  style={{ background: getCategoryVisual(c.slug).fallback }}
                >
                  <img
                    src={getCategoryVisual(c.slug).imageUrl}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.remove();
                    }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute right-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-bold text-emerald-900 shadow-sm">
                    {getCategoryVisual(c.slug).code}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/75 via-emerald-950/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-sm font-bold text-white drop-shadow">{c.name}</h3>
                    <p className="mt-0.5 text-xs font-medium text-white/85">
                      {c.productCount} {c.productCount === 1 ? "product" : "products"}
                    </p>
                  </div>
                </div>
                <div className="flex min-h-16 items-center px-3 py-2">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {c.subcategories
                      .slice(0, 3)
                      .map((sub) => sub.name)
                      .join(" • ")}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function mergeCategoryList(apiCategories: Category[] | undefined) {
  const apiBySlug = new Map((apiCategories ?? []).map((category) => [category.slug, category]));
  const fallbackSlugs = new Set(fallbackCategories.map((category) => category.slug));
  const apiOnlyCategories = (apiCategories ?? []).filter(
    (category) => !fallbackSlugs.has(category.slug),
  );

  return [...fallbackCategories, ...apiOnlyCategories].map((fallback) => {
    const api = apiBySlug.get(fallback.slug);
    return {
      ...fallback,
      ...api,
      imageUrl: api?.imageUrl ?? fallback.imageUrl,
      productCount: api?.productCount ?? 0,
      subcategories: api?.subcategories?.length ? api.subcategories : fallback.subcategories,
    };
  });
}
