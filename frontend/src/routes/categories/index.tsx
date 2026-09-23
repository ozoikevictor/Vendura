import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useQuery } from "@tanstack/react-query";
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
  const { data: apiCategories } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const catalogCategories = apiCategories ?? [];

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
                  {c.subcategories.length} subcategories
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
