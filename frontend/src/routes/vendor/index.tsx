import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorOverview, getVendorBalance } from "@/services/vendorService";
import { getVendorOrders } from "@/services/orderService";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { StoreLinkCard } from "@/components/vendor/StoreLinkCard";
import { getVendorStore } from "@/services/storeService";
import { useAuthStore } from "@/store/auth";
import { formatNaira, formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor/")({
  head: () => ({
    meta: [
      { title: "Vendor Dashboard — Vendura" },
      { name: "description", content: "Overview of your Vendura store." },
      { property: "og:title", content: "Vendor Dashboard — Vendura" },
      { property: "og:description", content: "Overview of your Vendura store." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorOverviewPage,
});

function VendorOverviewPage() {
  const user = useAuthStore((state) => state.user);
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["vendor-store", user?.storeId],
    queryFn: () => getVendorStore(user?.id ?? ""),
    enabled: Boolean(user?.storeId),
  });
  const { data: overview, isLoading } = useQuery({
    queryKey: ["vendor-overview", user?.storeId],
    queryFn: getVendorOverview,
    enabled: Boolean(user?.storeId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  const { data: balance } = useQuery({
    queryKey: ["vendor-balance"],
    queryFn: getVendorBalance,
  });

  const { data: orders } = useQuery({
    queryKey: ["vendor-orders-recent", user?.storeId],
    queryFn: () => getVendorOrders(user?.storeId ?? ""),
    enabled: Boolean(user?.storeId),
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  if (isLoading || storeLoading || !overview || !store) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Revenue",
      value: formatNaira(overview.totalRevenue),
      icon: TrendingUp,
      trend: "+12.4%",
      up: true,
      tint: "text-primary",
    },
    {
      label: "Orders",
      value: overview.ordersCount.toString(),
      icon: ShoppingBag,
      trend: "+8.2%",
      up: true,
      tint: "text-success",
    },
    {
      label: "Products",
      value: overview.productsCount.toString(),
      icon: Package,
      trend: "+3",
      up: true,
      tint: "text-info",
    },
    {
      label: "Customers",
      value: overview.customersCount.toString(),
      icon: Users,
      trend: "+24",
      up: true,
      tint: "text-clay",
    },
  ];

  const maxRevenue = Math.max(...overview.revenueSeries.map((s) => s.value));
  const maxOrders = Math.max(...overview.ordersSeries.map((s) => s.value));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.fullName?.split(" ")[0] ?? "seller"}. Here's how {store.name} is
          doing.
        </p>
      </div>

      <StoreLinkCard
        storeSlug={store.slug}
        storeName={store.name}
        productCount={overview.productsCount}
      />

      {/* Alerts */}
      <div className="flex flex-wrap gap-3">
        {overview.pendingOrders > 0 && (
          <Link
            to="/vendor/orders"
            className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-foreground hover:bg-warning-soft/80"
          >
            <AlertTriangle className="h-4 w-4" /> {overview.pendingOrders} pending orders need
            attention
          </Link>
        )}
        {overview.lowStockCount > 0 && (
          <Link
            to="/vendor/inventory"
            className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-foreground hover:bg-warning-soft/80"
          >
            <AlertTriangle className="h-4 w-4" /> {overview.lowStockCount} products running low
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg bg-accent",
                    stat.tint,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    stat.up ? "text-success" : "text-destructive",
                  )}
                >
                  {stat.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {stat.trend}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Revenue (last 7 months)</h2>
          <div className="mt-4 flex h-48 items-end gap-2">
            {overview.revenueSeries.map((point) => (
              <div
                key={point.label}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <div
                  className="w-full rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
                  style={{ height: `${Math.max((point.value / maxRevenue) * 100, 2)}%` }}
                  title={formatNaira(point.value)}
                />
                <span className="text-xs text-muted-foreground">{point.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Orders chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Orders (this week)</h2>
          <div className="mt-4 flex h-48 items-end gap-2">
            {overview.ordersSeries.map((point) => (
              <div
                key={point.label}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <div
                  className="w-full rounded-t-md bg-clay/70 transition-colors hover:bg-clay"
                  style={{ height: `${Math.max((point.value / maxOrders) * 100, 2)}%` }}
                  title={`${point.value} orders`}
                />
                <span className="text-xs text-muted-foreground">{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Balance + recent orders */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Balance */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            <Wallet className="h-4 w-4 text-primary" /> Balance
          </h2>
          {balance && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-success">{formatNaira(balance.available)}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-foreground">{formatNaira(balance.pending)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total paid</span>
                <span className="font-medium text-foreground">
                  {formatNaira(balance.totalPaid)}
                </span>
              </div>
              {balance.nextPayoutAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Next payout</span>
                  <span className="font-medium text-foreground">
                    {formatDate(balance.nextPayoutAt)}
                  </span>
                </div>
              )}
              <Link
                to="/vendor/payouts"
                className="block rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Request Payout
              </Link>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent Orders</h2>
            <Link to="/vendor/orders" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {orders?.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                to="/vendor/orders/$orderId"
                params={{ orderId: order.id }}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
              >
                <img
                  src={order.items[0]?.productImage}
                  alt=""
                  className="h-10 w-10 rounded border border-border object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatNaira(order.total)}
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Top products */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Top Products</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Sales</th>
                <th className="pb-2 pr-4">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {overview.topProducts.map((p, i) => (
                <tr key={p.productId} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                      <span className="font-medium text-foreground">{p.name}</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{p.sales}</td>
                  <td className="py-2.5 pr-4 font-medium text-foreground">
                    {formatNaira(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
