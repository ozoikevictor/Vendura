import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, TrendingUp, ShoppingCart, Package, Users, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorOverview } from "@/services/vendorService";
import { formatNaira } from "@/utils/format";
import { cn } from "@/lib/utils";
import { DataLoader } from "@/components/shared/DataLoader";

export const Route = createFileRoute("/vendor/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Vendor — Vendraza" },
      { name: "description", content: "Track your performance." },
      { property: "og:title", content: "Analytics — Vendraza" },
      { property: "og:description", content: "Track your performance." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorAnalyticsPage,
});

function VendorAnalyticsPage() {
  const { data: ov, isLoading } = useQuery({
    queryKey: ["vendor-overview"],
    queryFn: getVendorOverview,
  });

  if (isLoading || !ov) return <DataLoader label="Loading analytics" className="min-h-0 flex-1" />;

  const maxRev = Math.max(1, ...ov.revenueSeries.map((d) => d.value));
  const maxOrders = Math.max(1, ...ov.ordersSeries.map((d) => d.value));
  const maxTopRev = Math.max(1, ...ov.topProducts.map((p) => p.revenue));
  const revenueSeries = currentMonthSeries(ov.revenueSeries);
  const ordersSeries = currentWeekSeries(ov.ordersSeries);

  const stats = [
    {
      label: "Total Revenue",
      value: formatNaira(ov.totalRevenue),
      icon: <DollarSign className="h-5 w-5" />,
      tint: "bg-primary-soft text-primary",
    },
    {
      label: "Orders",
      value: ov.ordersCount.toString(),
      icon: <ShoppingCart className="h-5 w-5" />,
      tint: "bg-success-soft text-success",
    },
    {
      label: "Products",
      value: ov.productsCount.toString(),
      icon: <Package className="h-5 w-5" />,
      tint: "bg-warning-soft text-warning-foreground",
    },
    {
      label: "Customers",
      value: ov.customersCount.toString(),
      icon: <Users className="h-5 w-5" />,
      tint: "bg-accent text-foreground",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 items-start gap-2">
        <Link
          to="/vendor"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          aria-label="Back to overview"
          title="Back to overview"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your store performance at a glance</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", s.tint)}>
                {s.icon}
              </div>
              <p className="mt-3 text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> Revenue (7 months)
            </h2>
            <div className="mt-4 flex h-40 items-end gap-2">
              {revenueSeries.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center" style={{ height: "100%" }}>
                    <div
                      className="w-full max-w-8 rounded-t bg-primary transition-all"
                      style={{
                        height: d.value > 0 ? `${Math.max((d.value / maxRev) * 100, 4)}%` : "2px",
                      }}
                      title={formatNaira(d.value)}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Orders chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
              <ShoppingCart className="h-4 w-4 text-primary" /> Orders (this week)
            </h2>
            <div className="mt-4 flex h-40 items-end gap-2">
              {ordersSeries.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center" style={{ height: "100%" }}>
                    <div
                      className="w-full max-w-8 rounded-t bg-success transition-all"
                      style={{
                        height:
                          d.value > 0 ? `${Math.max((d.value / maxOrders) * 100, 4)}%` : "2px",
                      }}
                      title={`${d.value} orders`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Top Products</h2>
          <div className="mt-3 space-y-2">
            {ov.topProducts.map((p, i) => (
              <div key={p.productId} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-foreground">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{p.name}</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatNaira(p.revenue)}
                    </p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(p.revenue / maxTopRev) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.sales} sales</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
