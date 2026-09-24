import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Trash2 } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/OrderStatusBadge";
import { EscrowBadge } from "@/components/shared/EscrowBadge";
import { DataLoader } from "@/components/shared/DataLoader";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomerOrders, removeOrderFromHistory } from "@/services/orderService";
import { useAuthStore } from "@/store/auth";
import { formatNaira, formatDate } from "@/utils/format";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["customer-orders", user?.id],
    queryFn: () => getCustomerOrders(user?.id ?? "user-cust-1"),
    enabled: user?.role === "customer",
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 10_000,
  });
  const remove = useMutation({
    mutationFn: removeOrderFromHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      toast.success("Order removed from your history");
    },
    onError: () => toast.error("Order could not be removed"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <DataLoader label="Loading your orders" className="min-h-[60dvh]" />
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
            <div key={order.id} className="relative rounded-xl border border-border bg-card transition-colors hover:border-primary/30">
              <Link to="/customer/orders/$orderId" params={{ orderId: order.id }} className="block p-4 pr-14">
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
              <button type="button" title="Remove order" aria-label={`Remove order ${order.orderNumber} from history`} disabled={remove.isPending} onClick={() => { if (window.confirm("Remove this order from your history? The order record will remain safe.")) remove.mutate(order.id); }} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
