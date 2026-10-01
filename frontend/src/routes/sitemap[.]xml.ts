import { createFileRoute } from "@tanstack/react-router";
import { fetchPublicApi, SITE_URL } from "@/lib/seo";
import type { Category, Paginated, Product, Store } from "@/types";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [products, stores, categories] = await Promise.all([
          fetchPublicApi<Paginated<Product>>("/products?pageSize=100"),
          fetchPublicApi<Store[]>("/stores"),
          fetchPublicApi<Category[]>("/categories"),
        ]);

        const now = new Date().toISOString();
        const urls: SitemapUrl[] = [
          { loc: "/", priority: "1.0", changefreq: "daily", lastmod: now },
          { loc: "/marketplace", priority: "0.9", changefreq: "daily", lastmod: now },
          { loc: "/categories", priority: "0.8", changefreq: "weekly", lastmod: now },
          { loc: "/stores", priority: "0.8", changefreq: "daily", lastmod: now },
          { loc: "/vendor-register", priority: "0.7", changefreq: "monthly", lastmod: now },
          { loc: "/help", priority: "0.5", changefreq: "monthly", lastmod: now },
          { loc: "/contact", priority: "0.5", changefreq: "monthly", lastmod: now },
          { loc: "/safety", priority: "0.4", changefreq: "monthly", lastmod: now },
          { loc: "/terms", priority: "0.3", changefreq: "yearly", lastmod: now },
          { loc: "/privacy", priority: "0.3", changefreq: "yearly", lastmod: now },
          { loc: "/returns", priority: "0.3", changefreq: "yearly", lastmod: now },
          { loc: "/delivery-policy", priority: "0.3", changefreq: "yearly", lastmod: now },
          ...(categories ?? []).map((category) => ({
            loc: `/categories/${category.slug}`,
            priority: "0.7",
            changefreq: "weekly",
            lastmod: now,
          })),
          ...(stores ?? [])
            .filter((store) => store.productCount > 0)
            .map((store) => ({
              loc: `/store/${store.slug}`,
              priority: "0.7",
              changefreq: "daily",
              lastmod: store.joinedAt ?? now,
            })),
          ...(products?.items ?? []).map((product) => ({
            loc: `/product/${product.slug}`,
            priority: "0.8",
            changefreq: "daily",
            lastmod: product.updatedAt ?? product.createdAt ?? now,
          })),
        ];

        return new Response(renderSitemap(urls), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600",
          },
        });
      },
    },
  },
});

type SitemapUrl = {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
};

function renderSitemap(urls: SitemapUrl[]) {
  const uniqueUrls = new Map(urls.map((url) => [url.loc, url]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...uniqueUrls.values()]
  .map(
    (url) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${url.loc}`)}</loc>
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
