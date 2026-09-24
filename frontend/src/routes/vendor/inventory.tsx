import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, AlertTriangle, CheckCircle2, XCircle, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorProducts } from "@/services/productService";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataLoader } from "@/components/shared/DataLoader";
import { CURRENT_VENDOR_STORE_ID } from "@/data/stores";
import { formatNaira } from "@/utils/format";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/vendor/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Vendor — Vendura" },
      { name: "description", content: "Track stock levels." },
      { property: "og:title", content: "Inventory — Vendura" },
      { property: "og:description", content: "Track stock levels." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorInventoryPage,
});

type Filter = "all" | "instock" | "lowstock" | "outofstock";

function VendorInventoryPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data: products, isLoading } = useQuery({
    queryKey: ["vendor-products"],
    queryFn: () => getVendorProducts(CURRENT_VENDOR_STORE_ID),
  });

  const filtered = products?.filter((p) => {
    if (filter === "instock") return p.stock > p.lowStockThreshold;
    if (filter === "lowstock") return p.stock > 0 && p.stock <= p.lowStockThreshold;
    if (filter === "outofstock") return p.stock === 0;
    return true;
  });

  const inStock = products?.filter((p) => p.stock > p.lowStockThreshold).length ?? 0;
  const lowStock = products?.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length ?? 0;
  const outOfStock = products?.filter((p) => p.stock === 0).length ?? 0;

  const filters: { id: Filter; label: string; count: number; icon: React.ReactNode; tint: string }[] = [
    { id: "all", label: "All", count: products?.length ?? 0, icon: <Boxes className="h-4 w-4" />, tint: "text-foreground" },
    { id: "instock", label: "In Stock", count: inStock, icon: <CheckCircle2 className="h-4 w-4" />, tint: "text-success" },
    { id: "lowstock", label: "Low Stock", count: lowStock, icon: <AlertTriangle className="h-4 w-4" />, tint: "text-warning" },
    { id: "outofstock", label: "Out of Stock", count: outOfStock, icon: <XCircle className="h-4 w-4" />, tint: "text-destructive" },
  ];

  if (isLoading) return <DataLoader label="Loading inventory" className="min-h-72" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">Track and manage stock levels</p>
        </div>
        <Link to="/vendor/products/new" className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Add Product
        </Link>
      </div>

      {/* Filter cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {filters.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={cn("flex items-center gap-2 rounded-xl border p-3 transition-colors", filter === f.id ? "border-primary bg-primary-soft" : "border-border bg-card hover:bg-accent")}>
            <span className={f.tint}>{f.icon}</span>
            <div className="text-left">
              <p className="text-lg font-bold text-foreground">{f.count}</p>
              <p className="text-xs text-muted-foreground">{f.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Inventory table */}
      {!filtered || filtered.length === 0 ? (
        <EmptyState icon={<Boxes className="h-7 w-7" />} title="No products in this filter" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4 text-center">Stock</th>
                <th className="pb-2 pr-4 text-center">Threshold</th>
                <th className="pb-2 pr-4 text-right">Price</th>
                <th className="pb-2 pr-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = p.stock === 0 ? "out" : p.stock <= p.lowStockThreshold ? "low" : "ok";
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <img src={p.images[0]} alt="" className="h-10 w-10 rounded border border-border object-cover" />
                        <Link to="/vendor/products/$productId" params={{ productId: p.id }} className="font-medium text-foreground hover:text-primary line-clamp-1">{p.name}</Link>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center font-medium text-foreground">{p.stock}</td>
                    <td className="py-3 pr-4 text-center text-muted-foreground">{p.lowStockThreshold}</td>
                    <td className="py-3 pr-4 text-right font-medium text-foreground">{formatNaira(p.price)}</td>
                    <td className="py-3 pr-4 text-center">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                        status === "ok" ? "bg-success-soft text-success" : status === "low" ? "bg-warning-soft text-warning-foreground" : "bg-destructive-soft text-destructive")}>
                        {status === "ok" ? "In Stock" : status === "low" ? "Low Stock" : "Out of Stock"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
