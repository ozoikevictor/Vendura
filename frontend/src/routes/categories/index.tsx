import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/categoryService";
import { canonicalLink, seoMeta } from "@/lib/seo";

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
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-frost"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {c.imageUrl ? (
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-primary-soft" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/70 via-emerald-950/10 to-transparent" />
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
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
