import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Pencil, Copy, Trash2, Package, Share2 } from "lucide-react";
import { buildProductUrl, copyToClipboard } from "@/utils/share";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVendorProducts,
  deleteVendorProduct,
  duplicateVendorProduct,
} from "@/services/productService";
import { DataLoader } from "@/components/shared/DataLoader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CURRENT_VENDOR_STORE_ID } from "@/data/stores";
import { formatNaira } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/types";
import { getSubscription } from "@/services/vendorService";
import { getErrorMessage } from "@/services/api";
import { useCompactStickyHeader } from "@/hooks/useCompactStickyHeader";

export const Route = createFileRoute("/vendor/products/")({
  head: () => ({
    meta: [
      { title: "Products — Vendor — Vendraza" },
      { name: "description", content: "Manage your products on Vendraza." },
      { property: "og:title", content: "Products — Vendraza" },
      { property: "og:description", content: "Manage your products on Vendraza." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorProductsPage,
});

const statusFilter = ["all", "active", "draft", "out_of_stock", "archived"] as const;
type StatusFilter = (typeof statusFilter)[number];

const statusBadge: Record<ProductStatus, string> = {
  active: "bg-success-soft text-success",
  draft: "bg-muted text-muted-foreground",
  out_of_stock: "bg-destructive-soft text-destructive",
  archived: "bg-muted text-muted-foreground",
};

function VendorProductsPage() {
  const stickyHeader = useCompactStickyHeader();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: () => getVendorProducts(CURRENT_VENDOR_STORE_ID),
  });
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  });

  const filtered = products?.filter((p) => {
    const matchesFilter = filter === "all" || p.status === filter;
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  async function handleDelete(id: string) {
    try {
      await deleteVendorProduct(id);
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicateVendorProduct(id);
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Product duplicated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to duplicate"));
    }
  }

  return (
    <div className="space-y-5">
      <div
        ref={stickyHeader.ref}
        className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-border bg-background/95 px-4 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1
              className={cn(
                "font-display font-bold text-foreground transition-[font-size]",
                stickyHeader.compact ? "text-xl" : "text-2xl",
              )}
            >
              Products
            </h1>
            <p className={cn("text-sm text-muted-foreground", stickyHeader.compact && "hidden")}>
              {products?.length ?? 0} products in your catalog
            </p>
          </div>
          <Link
            to={
              subscription?.canAddProduct === false
                ? "/vendor/subscription"
                : "/vendor/products/new"
            }
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:px-4"
          >
            <Plus className="h-4 w-4" />{" "}
            <span className="hidden sm:inline">
              {subscription?.canAddProduct === false ? "Choose a plan" : "Add Product"}
            </span>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-none sm:mx-0 sm:pb-0">
            {statusFilter.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  filter === s
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Product list */}
      {isLoading ? (
        <DataLoader label="Loading products" className="min-h-72" />
      ) : !filtered || filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No products found"
          description="Add your first product or adjust your filters."
          action={
            <Link
              to={
                subscription?.canAddProduct === false
                  ? "/vendor/subscription"
                  : "/vendor/products/new"
              }
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {subscription?.canAddProduct === false ? "Choose a plan" : "Add Product"}
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {/* Table header (desktop) */}
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground lg:grid">
            <span>Product</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-20 text-right">Price</span>
            <span className="w-16 text-center">Stock</span>
            <span className="w-32 text-center">Actions</span>
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-center"
            >
              {/* Product info */}
              <div className="flex items-center gap-3">
                <img
                  src={p.images[0]}
                  alt=""
                  className="h-12 w-12 rounded-lg border border-border object-cover"
                />
                <div className="min-w-0">
                  <Link
                    to="/vendor/products/$productId"
                    params={{ productId: p.id }}
                    className="text-sm font-medium text-foreground hover:text-primary line-clamp-1"
                  >
                    {p.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">SKU: {p.sku}</span>
                    {p.negotiable && (
                      <span className="rounded bg-primary-soft px-1.5 text-xs font-medium text-primary">
                        Negotiable
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Status */}
              <div className="flex items-center gap-2 lg:w-20 lg:justify-center">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    statusBadge[p.status],
                  )}
                >
                  {p.status.replace(/_/g, " ")}
                </span>
              </div>
              {/* Price */}
              <div className="lg:w-20 lg:text-right">
                <span className="text-sm font-semibold text-foreground">
                  {formatNaira(p.price)}
                </span>
                {p.oldPrice && (
                  <span className="ml-1 text-xs text-muted-foreground line-through">
                    {formatNaira(p.oldPrice)}
                  </span>
                )}
              </div>
              {/* Stock */}
              <div className="lg:w-16 lg:text-center">
                <span
                  className={cn(
                    "text-sm font-medium",
                    p.stock === 0
                      ? "text-destructive"
                      : p.stock <= p.lowStockThreshold
                        ? "text-warning"
                        : "text-foreground",
                  )}
                >
                  {p.stock}
                </span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 lg:w-32 lg:justify-center">
                <Link
                  to="/vendor/products/$productId"
                  params={{ productId: p.id }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  onClick={() => handleDuplicate(p.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={async () => {
                    const ok = await copyToClipboard(buildProductUrl(p.slug));
                    if (ok) toast.success("Product link copied — send it to a customer.");
                    else toast.error("Could not copy the link.");
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Copy product link"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
