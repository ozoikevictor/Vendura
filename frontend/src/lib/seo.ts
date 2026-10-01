import type { Category, Product, Store } from "@/types";

export const SITE_URL = "https://vendraza.com";
export const SITE_NAME = "Vendraza";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/victor-fashion-logo.png`;

const API_URL = (import.meta.env["VITE_API_URL"] ?? "http://localhost:4000/api").replace(/\/$/, "");

type MetaTag =
  { title: string } | { name: string; content: string } | { property: string; content: string };

export type SeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "product";
  robots?: string;
};

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function absoluteImageUrl(image?: string) {
  if (!image) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("data:")) return DEFAULT_OG_IMAGE;
  return absoluteUrl(image);
}

export function truncateSeoText(value: string, maxLength = 155) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

export function seoMeta({
  title,
  description,
  path = "/",
  image,
  type = "website",
  robots = "index, follow",
}: SeoInput): MetaTag[] {
  const canonical = absoluteUrl(path);
  const ogImage = absoluteImageUrl(image);

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: robots },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export function canonicalLink(path = "/") {
  return [{ rel: "canonical", href: absoluteUrl(path) }];
}

export function noindexMeta(title: string, description = "Private Vendraza page.") {
  return seoMeta({ title, description, robots: "noindex, nofollow" });
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/victor-fashion-logo.png`,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function productJsonLd(product: Product, store?: Store, category?: Category) {
  const productUrl = absoluteUrl(`/product/${product.slug}`);
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map(absoluteImageUrl),
    description: truncateSeoText(product.description, 300),
    sku: product.sku,
    category: category?.name,
    brand: {
      "@type": "Brand",
      name: store?.name ?? SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: product.currency,
      price: product.price,
      availability:
        product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: store?.name ?? SITE_NAME,
      },
    },
  };

  if (product.reviewCount > 0 && product.rating > 0) {
    schema["aggregateRating"] = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    };
  }

  return schema;
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function jsonLdScript(value: unknown) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(value).replace(/</g, "\\u003c"),
  };
}

export async function fetchPublicApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: T };
    return payload.data ?? null;
  } catch {
    return null;
  }
}
