import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Pencil, Copy, Trash2, Package, Share2, Eye } from "lucide-react";
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
  const productCounts = statusFilter.reduce(
    (counts, status) => ({
      ...counts,
      [status]:
        status === "all"
          ? (products?.length ?? 0)
          : (products ?? []).filter((p) => p.status === status).length,
    }),
    {} as Record<StatusFilter, number>,
  );

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
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products?.length ?? 0} products in your catalog
          </p>
        </div>
        <Link
          to={
            subscription?.canAddProduct === false ? "/vendor/subscription" : "/vendor/products/new"
          }
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />{" "}
          {subscription?.canAddProduct === false ? "Choose a plan" : "Add Product"}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {statusFilter.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                filter === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span>{s.replace(/_/g, " ")}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px]",
                  filter === s ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {productCounts[s]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
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

      {/* Product list */}
      {isLoading ? (
        <DataLoader label="Loading products" className="min-h-0 flex-1" />
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {/* Table header (desktop) */}
          <div className="hidden shrink-0 grid-cols-[minmax(0,1fr)_112px_112px_92px_168px] gap-4 border-b border-border bg-card px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Product</span>
            <span className="text-center">Status</span>
            <span className="text-right">Price</span>
            <span className="text-center">Stock</span>
            <span className="text-center">Actions</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-background/40 p-2 lg:space-y-0 lg:p-0">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="group grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card active:translate-y-0 lg:grid-cols-[minmax(0,1fr)_112px_112px_92px_168px] lg:items-center lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-4 lg:py-3 lg:shadow-none lg:hover:bg-primary-soft/40"
              >
                {/* Product info */}
                <div className="flex min-w-0 items-center gap-3">
                  <Link
                    to="/vendor/products/$productId"
                    params={{ productId: p.id }}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                    aria-label={`Open ${p.name}`}
                  >
                    <img
                      src={p.images[0]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 text-primary-foreground opacity-0 transition-all group-hover:bg-foreground/35 group-hover:opacity-100">
                      <Eye className="h-4 w-4" />
                    </span>
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to="/vendor/products/$productId"
                      params={{ productId: p.id }}
                      className="line-clamp-1 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {p.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
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
                <div className="flex items-center gap-2 lg:justify-center">
                  <span className="text-xs font-medium text-muted-foreground lg:hidden">
                    Status
                  </span>
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
                <div className="flex items-center justify-between gap-3 lg:block lg:text-right">
                  <span className="text-xs font-medium text-muted-foreground lg:hidden">Price</span>
                  <span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatNaira(p.price)}
                    </span>
                    {p.oldPrice && (
                      <span className="ml-1 text-xs text-muted-foreground line-through">
                        {formatNaira(p.oldPrice)}
                      </span>
                    )}
                  </span>
                </div>
                {/* Stock */}
                <div className="flex items-center justify-between gap-3 lg:block lg:text-center">
                  <span className="text-xs font-medium text-muted-foreground lg:hidden">Stock</span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-sm font-semibold",
                      p.stock === 0
                        ? "bg-destructive-soft text-destructive"
                        : p.stock <= p.lowStockThreshold
                          ? "bg-warning-soft text-warning-foreground"
                          : "bg-success-soft text-success",
                    )}
                  >
                    {p.stock}
                  </span>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 lg:justify-center">
                  <Link
                    to="/vendor/products/$productId"
                    params={{ productId: p.id }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDuplicate(p.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Duplicate"
                    title="Duplicate"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await copyToClipboard(buildProductUrl(p.slug));
                      if (ok) toast.success("Product link copied — send it to a customer.");
                      else toast.error("Could not copy the link.");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Copy product link"
                    title="Copy product link"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
