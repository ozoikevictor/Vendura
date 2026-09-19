/**
 * Helpers for building public, shareable links to a vendor's storefront
 * and products. The origin is resolved at runtime so the same code works
 * in preview, on a custom domain, and once a backend is connected.
 */

const FALLBACK_ORIGIN = "https://vendura.app";

export function getSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
}

export function buildStoreUrl(storeSlug: string): string {
  return `${getSiteOrigin()}/store/${storeSlug}`;
}

export function buildProductUrl(productSlug: string): string {
  return `${getSiteOrigin()}/product/${productSlug}`;
}

/** Pretty version for display (no protocol). */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}
