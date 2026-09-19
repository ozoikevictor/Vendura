import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, Gavel, Package, ReceiptText, Store, Users } from "lucide-react";
import { AdminHeading, LoadingRows, Metric, Status, TableShell } from "@/components/admin/AdminUI";
import { getAdminOverview } from "@/services/adminService";
import { formatDateTime, formatNaira } from "@/utils/format";

export const Route = createFileRoute("/admin/")({ component: AdminOverviewPage });

function AdminOverviewPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: getAdminOverview });
  if (isLoading || !data) return <LoadingRows />;
  return <>
    <AdminHeading title="Platform overview" description="A live view of Vendura's marketplace activity." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Gross sales" value={formatNaira(data.grossSales)} detail={`${data.paidOrders} paid orders`} icon={<BadgeDollarSign className="h-5 w-5" />} />
      <Metric label="Platform fees" value={formatNaira(data.platformFees)} detail="5% marketplace commission" icon={<ReceiptText className="h-5 w-5" />} />
      <Metric label="Vendors" value={data.vendors.toLocaleString()} detail={`${data.verifiedStores} verified stores`} icon={<Store className="h-5 w-5" />} />
      <Metric label="Customers" value={data.customers.toLocaleString()} detail={`${data.users} total accounts`} icon={<Users className="h-5 w-5" />} />
      <Metric label="Products" value={data.products.toLocaleString()} detail={`${data.activeProducts} currently active`} icon={<Package className="h-5 w-5" />} />
      <Metric label="Orders" value={data.orders.toLocaleString()} detail="Across every storefront" icon={<ReceiptText className="h-5 w-5" />} />
      <Metric label="Pending payouts" value={formatNaira(data.pendingPayoutAmount)} detail={`${data.pendingPayouts} requests`} icon={<BadgeDollarSign className="h-5 w-5" />} />
      <Metric label="Open disputes" value={data.openDisputes.toLocaleString()} detail="Awaiting an admin decision" icon={<Gavel className="h-5 w-5" />} />
    </div>
    <div className="mt-8 mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Recent orders</h2><Link to="/admin/orders" className="text-sm font-semibold text-primary">View all</Link></div>
    <TableShell><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Order</th><th>Customer</th><th>Store</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>{data.recentOrders.map((order) => <tr key={order.id} className="border-t border-border"><td className="px-4 py-3 font-semibold">{order.orderNumber}</td><td>{order.customerName}</td><td>{order.storeName}</td><td>{formatNaira(order.total)}</td><td><Status value={order.paymentStatus === "paid" ? order.status : order.paymentStatus} /></td><td className="text-muted-foreground">{formatDateTime(order.placedAt)}</td></tr>)}</tbody></table></TableShell>
  </>;
}
