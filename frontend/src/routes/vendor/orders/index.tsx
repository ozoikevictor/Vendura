import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorOrders, ORDER_STATUS_FLOW } from "@/services/orderService";
import { ORDER_STATUS_LABEL } from "@/data/orders";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/OrderStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataLoader } from "@/components/shared/DataLoader";
import { useAuthStore } from "@/store/auth";
import { formatNaira, formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const Route = createFileRoute("/vendor/orders/")({
  head: () => ({
    meta: [
      { title: "Orders — Vendor — Vendura" },
      { name: "description", content: "Manage customer orders." },
      { property: "og:title", content: "Orders — Vendura" },
      { property: "og:description", content: "Manage customer orders." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorOrdersPage,
});

const tabs: { id: "all" | OrderStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "placed", label: "New" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function VendorOrdersPage() {
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");

  const {
    data: orders,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["vendor-orders", user?.storeId],
    queryFn: () => getVendorOrders(user?.storeId ?? ""),
    enabled: Boolean(user?.storeId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  const filtered = orders?.filter((o) => {
    const matchesTab = tab === "all" || o.status === tab;
    const matchesSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  }).sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{orders?.length ?? 0} total orders</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
          >
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive-soft p-4"
        >
          <p className="text-sm font-medium text-destructive">Orders could not be loaded.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-semibold text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <DataLoader label="Loading orders" className="min-h-72" />
      ) : !filtered || filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No orders found"
          description="Orders will appear here when customers buy."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <Link
              key={order.id}
              to="/vendor/orders/$orderId"
              params={{ orderId: order.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
            >
              <img
                src={order.items[0]?.productImage}
                alt=""
                className="h-12 w-12 rounded-lg border border-border object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{order.orderNumber}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {order.customerName} · {formatDate(order.placedAt)} · {order.items.length} item
                  {order.items.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{formatNaira(order.total)}</p>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
