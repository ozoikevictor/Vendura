import { createFileRoute, Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/shared/EmptyState";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/OrderStatusBadge";
import { EscrowBadge } from "@/components/shared/EscrowBadge";
import { DataLoader } from "@/components/shared/DataLoader";
import { useQuery } from "@tanstack/react-query";
import { getCustomerOrders } from "@/services/orderService";
import { useAuthStore } from "@/store/auth";
import { formatNaira, formatDate } from "@/utils/format";

export const Route = createFileRoute("/customer/orders/")({
  head: () => ({
    meta: [
      { title: "Your Orders — Vendura" },
      { name: "description", content: "Track and manage your Vendura orders." },
      { property: "og:title", content: "Your Orders — Vendura" },
      { property: "og:description", content: "Track and manage your Vendura orders." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const user = useAuthStore((s) => s.user);
  const { data: orders, isLoading } = useQuery({
    queryKey: ["customer-orders", user?.id],
    queryFn: () => getCustomerOrders(user?.id ?? "user-cust-1"),
    enabled: user?.role === "customer",
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <DataLoader label="Loading your orders" className="min-h-[60dvh]" />
        <SiteFooter />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title="No orders yet"
          description="When you place an order, it'll show up here."
          action={<Link to="/marketplace" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse Marketplace</Link>}
        />
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Your Orders</h1>
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to="/customer/orders/$orderId"
              params={{ orderId: order.id }}
              className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{order.orderNumber}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  {order.escrow && <div className="mt-1.5"><EscrowBadge status={order.escrow.status} /></div>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.items.length} item{order.items.length > 1 ? "s" : ""} · {formatDate(order.placedAt)} · {order.storeName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatNaira(order.total)}</p>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
              </div>
              {/* Items preview */}
              <div className="mt-3 flex gap-2">
                {order.items.slice(0, 4).map((item) => (
                  <img key={item.id} src={item.productImage} alt="" className="h-12 w-12 rounded-lg border border-border object-cover" />
                ))}
                {order.items.length > 4 && (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-accent text-xs font-medium text-muted-foreground">
                    +{order.items.length - 4}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
