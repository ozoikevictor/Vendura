import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/categoryService";
import { categories as fallbackCategories } from "@/data/categories";
import { canonicalLink, seoMeta } from "@/lib/seo";
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

        <div className="mt-6 rounded-lg border border-border bg-card p-3 shadow-card sm:p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {catalogCategories.map((c) => (
              <Link key={c.id} to="/categories/$slug" params={{ slug: c.slug }} className="group">
                <article className="text-center transition-transform duration-200 group-hover:-translate-y-0.5">
                  <div className="mx-auto h-16 w-full max-w-28 transition-transform duration-200 group-hover:scale-105 sm:h-20">
                    <CategoryArtwork slug={c.slug} name={c.name} />
                  </div>
                  <h3 className="mt-2 line-clamp-2 min-h-10 px-1 text-sm font-semibold leading-tight text-foreground sm:text-base">
                    {c.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  </p>
                </article>
              </Link>
            ))}
          </div>
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
