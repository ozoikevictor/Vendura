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
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorOverview, getVendorBalance } from "@/services/vendorService";
import { getVendorOrders } from "@/services/orderService";
import { OrderStatusBadge } from "@/components/shared/OrderStatusBadge";
import { StoreLinkCard } from "@/components/vendor/StoreLinkCard";
import { DataLoader } from "@/components/shared/DataLoader";
import { getVendorStore } from "@/services/storeService";
import { useAuthStore } from "@/store/auth";
import { formatNaira, formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor/")({
  head: () => ({
    meta: [
      { title: "Vendor Dashboard — Vendraza" },
      { name: "description", content: "Overview of your Vendraza store." },
      { property: "og:title", content: "Vendor Dashboard — Vendraza" },
      { property: "og:description", content: "Overview of your Vendraza store." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorOverviewPage,
});

function VendorOverviewPage() {
  const user = useAuthStore((state) => state.user);
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["vendor-store", user?.id],
    queryFn: () => getVendorStore(user?.id ?? ""),
    enabled: Boolean(user),
    retry: false,
  });
  const {
    data: overview,
    isLoading,
    isError: overviewError,
  } = useQuery({
    queryKey: ["vendor-overview", user?.id],
    queryFn: getVendorOverview,
    enabled: Boolean(user),
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  const { data: balance } = useQuery({
    queryKey: ["vendor-balance"],
    queryFn: getVendorBalance,
    enabled: Boolean(user),
    retry: false,
  });

  const { data: orders } = useQuery({
    queryKey: ["vendor-orders-recent", store?.id],
    queryFn: () => getVendorOrders(store?.id ?? ""),
    enabled: Boolean(store?.id),
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  if (isLoading || storeLoading) {
    return <DataLoader label="Loading dashboard" className="min-h-[65dvh]" />;
  }

  if (!store || !overview || overviewError) {
    return (
      <div className="flex min-h-[65dvh] items-center justify-center">
        <div className="max-w-lg rounded-xl border border-border bg-card p-6 text-center shadow-card">
          <h1 className="font-display text-xl font-bold text-foreground">
            Your vendor dashboard is not ready yet
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You are logged in as {user?.fullName ?? "a vendor"}, but this account does not have a
            store dashboard response from the API yet. Once the store is attached, this page will
            show the new dashboard.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/vendor/settings"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
            >
              Check settings
            </Link>
            <Link
              to="/vendor-register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Create store
            </Link>
          </div>
        </div>
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

  const maxRevenue = Math.max(1, ...overview.revenueSeries.map((s) => s.value));
  const maxOrders = Math.max(1, ...overview.ordersSeries.map((s) => s.value));
  const revenueSeries = currentMonthSeries(overview.revenueSeries);
  const ordersSeries = currentWeekSeries(overview.ordersSeries);
  const recentOrders = orders?.slice(0, 5) ?? [];
  const activeOrders = recentOrders.filter((order) =>
    ["placed", "payment_confirmed", "processing", "shipped", "out_for_delivery"].includes(
      order.status,
    ),
  ).length;

  return (
    <div className="space-y-4 xl:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Vendor dashboard</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
                {store.name} overview
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Welcome back, {user?.fullName?.split(" ")[0] ?? "seller"}. Keep today&apos;s orders,
                cash flow, and stock issues in one place.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-72">
              <Signal
                icon={Clock3}
                label="Needs action"
                value={`${overview.pendingOrders} orders`}
                tone="warning"
              />
              <Signal
                icon={CheckCircle2}
                label="Available"
                value={formatNaira(balance?.available ?? overview.availableBalance)}
                tone="success"
              />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent",
                        stat.tint,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold",
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
                  <p className="mt-3 truncate text-2xl font-bold leading-none text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <StoreLinkCard
            storeSlug={store.slug}
            storeName={store.name}
            productCount={overview.productsCount}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {overview.pendingOrders > 0 && (
              <AlertLink
                to="/vendor/orders"
                label={`${overview.pendingOrders} pending orders need attention`}
              />
            )}
            {overview.lowStockCount > 0 && (
              <AlertLink
                to="/vendor/inventory"
                label={`${overview.lowStockCount} products running low`}
              />
            )}
          </div>
        </div>
      </section>

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Revenue chart */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartPanel title="Revenue (last 7 months)">
            {revenueSeries.map((point) => (
              <Bar
                key={point.label}
                label={point.label}
                title={formatNaira(point.value)}
                value={point.value}
                max={maxRevenue}
                className="bg-primary/80 hover:bg-primary"
              />
            ))}
          </ChartPanel>
          <ChartPanel title="Orders (this week)">
            {ordersSeries.map((point) => (
              <Bar
                key={point.label}
                label={point.label}
                title={`${point.value} orders`}
                value={point.value}
                max={maxOrders}
                className="bg-clay/70 hover:bg-clay"
              />
            ))}
          </ChartPanel>
        </div>

        {/* Balance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            <Wallet className="h-4 w-4 text-primary" /> Balance
          </h2>
          {balance && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Available to withdraw</p>
                <p className="text-2xl font-bold text-success">{formatNaira(balance.available)}</p>
              </div>
              <div className="rounded-lg bg-success-soft p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending clearance</span>
                  <span className="font-semibold text-foreground">
                    {formatNaira(balance.pending)}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-background">
                  <div
                    className="h-2 rounded-full bg-success"
                    style={{
                      width: `${Math.min(
                        100,
                        (balance.available / Math.max(balance.available + balance.pending, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoTile label="Total paid" value={formatNaira(balance.totalPaid)} />
                <InfoTile
                  label="Next payout"
                  value={balance.nextPayoutAt ? formatDate(balance.nextPayoutAt) : "Not set"}
                />
              </div>
              <Link
                to="/vendor/payouts"
                className="block rounded-lg bg-primary py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Request Payout
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        {/* Recent orders */}
        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent Orders</h2>
              <p className="text-xs text-muted-foreground">
                {activeOrders} active orders in this view
              </p>
            </div>
            <Link to="/vendor/orders" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                to="/vendor/orders/$orderId"
                params={{ orderId: order.id }}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:bg-accent"
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
                  <p className="text-xs text-muted-foreground line-clamp-1">{order.customerName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatNaira(order.total)}
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Top Products</h2>
          <p className="text-xs text-muted-foreground">Best sellers by recorded revenue</p>
          <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain pr-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
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
    </div>
  );
}

function Signal({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
  tone: "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "success"
          ? "border-success/20 bg-success-soft"
          : "border-warning/30 bg-warning-soft",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon
          className={cn("h-4 w-4", tone === "success" ? "text-success" : "text-warning-foreground")}
        />
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function AlertLink({ to, label }: { to: "/vendor/orders" | "/vendor/inventory"; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm font-medium text-warning-foreground hover:bg-warning-soft/80"
    >
      <AlertTriangle className="h-4 w-4" /> {label}
    </Link>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-4 flex h-40 items-end gap-2">{children}</div>
    </div>
  );
}

function Bar({
  label,
  title,
  value,
  max,
  className,
}: {
  label: string;
  title: string;
  value: number;
  max: number;
  className: string;
}) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-end gap-1">
      <div
        className={cn("w-full rounded-t-md transition-colors", className)}
        style={{ height: value > 0 ? `${Math.max((value / max) * 100, 4)}%` : "2px" }}
        title={title}
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function currentMonthSeries<T extends { label: string; value: number }>(series: T[]) {
  const today = new Date();
  const labels = Array.from({ length: series.length }, (_, index) => {
    const month = new Date(today.getFullYear(), today.getMonth() - (series.length - 1 - index), 1);
    return month.toLocaleString("en-NG", { month: "short" });
  });
  return series.map((point, index) => ({ ...point, label: labels[index] ?? point.label }));
}

function currentWeekSeries<T extends { label: string; value: number }>(series: T[]) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return series.map((point, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return { ...point, label: day.toLocaleString("en-NG", { weekday: "short" }) };
  });
}
