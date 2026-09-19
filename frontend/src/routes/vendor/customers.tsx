import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorOrders } from "@/services/orderService";
import { CURRENT_VENDOR_STORE_ID } from "@/data/stores";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatNaira } from "@/utils/format";

export const Route = createFileRoute("/vendor/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Vendor — Vendura" },
      { name: "description", content: "Your customer base." },
      { property: "og:title", content: "Customers — Vendura" },
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
  const customerMap = new Map<string, { name: string; phone: string; orders: number; spent: number }>();
  orders?.forEach((o) => {
    const existing = customerMap.get(o.customerId);
    if (existing) {
      existing.orders++;
      existing.spent += o.total;
    } else {
      customerMap.set(o.customerId, { name: o.customerName, phone: o.customerPhone, orders: 1, spent: o.total });
    }
  });
  const customers = Array.from(customerMap.values()).sort((a, b) => b.spent - a.spent);

  if (customers.length === 0) {
    return <EmptyState icon={<Users className="h-7 w-7" />} title="No customers yet" description="Customers who buy from you will appear here." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} customers</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Phone</th>
              <th className="pb-2 pr-4 text-center">Orders</th>
              <th className="pb-2 pr-4 text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.name} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-foreground">{c.name}</td>
                <td className="py-3 pr-4 text-muted-foreground">{c.phone}</td>
                <td className="py-3 pr-4 text-center text-muted-foreground">{c.orders}</td>
                <td className="py-3 pr-4 text-right font-semibold text-foreground">{formatNaira(c.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
