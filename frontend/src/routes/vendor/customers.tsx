import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorOrders } from "@/services/orderService";
import { CURRENT_VENDOR_STORE_ID } from "@/data/stores";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatNaira } from "@/utils/format";

export const Route = createFileRoute("/vendor/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Vendor — Vendraza" },
      { name: "description", content: "Your customer base." },
      { property: "og:title", content: "Customers — Vendraza" },
      { property: "og:description", content: "Your customer base." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorCustomersPage,
});

function VendorCustomersPage() {
  const { data: orders } = useQuery({
    queryKey: ["vendor-orders"],
    queryFn: () => getVendorOrders(CURRENT_VENDOR_STORE_ID),
  });

  // Aggregate customers from orders
  const customerMap = new Map<
    string,
    { name: string; phone: string; orders: number; spent: number }
  >();
  orders?.forEach((o) => {
    const existing = customerMap.get(o.customerId);
    if (existing) {
      existing.orders++;
      existing.spent += o.total;
    } else {
      customerMap.set(o.customerId, {
        name: o.customerName,
        phone: o.customerPhone,
        orders: 1,
        spent: o.total,
      });
    }
  });
  const customers = Array.from(customerMap.values()).sort((a, b) => b.spent - a.spent);

  if (customers.length === 0) {
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
            <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground">0 customers</p>
          </div>
        </div>
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No customers yet"
          description="Customers who buy from you will appear here."
        />
      </div>
    );
  }

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
          <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} customers</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-border bg-card">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">Name</th>
              <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3">Phone</th>
              <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 text-center">
                Orders
              </th>
              <th className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 text-right">
                Total Spent
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.name} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{c.orders}</td>
                <td className="px-4 py-3 text-right font-semibold text-foreground">
                  {formatNaira(c.spent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
