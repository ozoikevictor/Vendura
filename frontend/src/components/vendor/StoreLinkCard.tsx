import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Check, ExternalLink, MessageCircle, Share2, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import {
  buildStoreUrl,
  buildWhatsAppShareUrl,
  copyToClipboard,
  displayUrl,
} from "@/utils/share";
import { cn } from "@/lib/utils";

interface StoreLinkCardProps {
  storeSlug: string;
  storeName: string;
  productCount?: number;
  className?: string;
}

/**
 * The vendor's shareable storefront link. Any WhatsApp/Instagram vendor can
 * copy this one link, send it to a customer, and the customer browses every
 * published product and orders straight from the storefront.
 */
export function StoreLinkCard({ storeSlug, storeName, productCount, className }: StoreLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const url = buildStoreUrl(storeSlug);

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      toast.success("Store link copied — paste it in WhatsApp or your bio.");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy. Long-press the link to copy it manually.");
    }
  };

  const shareMessage = `Shop from ${storeName} on Vendura — browse everything I sell and order directly: ${url}`;

  return (
    <section
      className={cn(
        "rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5",
        className,
      )}
      aria-labelledby="store-link-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <StoreIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 id="store-link-heading" className="text-base font-semibold text-foreground">
            Your store link
          </h2>
          <p className="text-sm text-muted-foreground">
            Share this one link with customers. They see everything you&apos;ve published
            {typeof productCount === "number" ? ` (${productCount} items)` : ""} and order right there.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground" title={url}>
          {displayUrl(url)}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Copy store link"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={buildWhatsAppShareUrl(shareMessage)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageCircle className="h-4 w-4 text-success" /> Share on WhatsApp
        </a>
        <Link
          to="/store/$storeSlug"
          params={{ storeSlug }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="h-4 w-4" /> Preview store
        </Link>
        <Link
          to="/vendor/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Share2 className="h-4 w-4" /> Add a product
        </Link>
      </div>
    </section>
  );
}
