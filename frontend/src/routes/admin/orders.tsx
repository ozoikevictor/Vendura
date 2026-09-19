import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { AdminHeading, LoadingRows, Status, TableShell } from "@/components/admin/AdminUI";
import { getAdminOrders } from "@/services/adminService";
import { formatDateTime, formatNaira } from "@/utils/format";

export const Route = createFileRoute("/admin/orders")({ component: OrdersPage });
function OrdersPage() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-orders"], queryFn: getAdminOrders });
  const shown = useMemo(() => { const q = search.trim().toLowerCase(); return !q ? data : data.filter((order) => [order.orderNumber, order.customerName, order.storeName].some((value) => value.toLowerCase().includes(q))); }, [data, search]);
  return <><AdminHeading title="Orders" description={`${data.length} orders placed across all Vendura stores.`} action={<label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders" className="h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm sm:w-64" /></label>} />{isLoading ? <LoadingRows /> : <TableShell><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Order</th><th>Customer</th><th>Store</th><th>Items</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Date</th></tr></thead><tbody>{shown.map((order) => <tr key={order.id} className="border-t border-border"><td className="px-4 py-3 font-semibold">{order.orderNumber}</td><td>{order.customerName}</td><td>{order.storeName}</td><td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="font-semibold">{formatNaira(order.total)}</td><td><Status value={order.paymentStatus} /></td><td><Status value={order.status} /></td><td className="text-muted-foreground">{formatDateTime(order.placedAt)}</td></tr>)}</tbody></table></TableShell>}</>;
}
