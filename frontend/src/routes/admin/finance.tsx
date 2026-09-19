import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, Clock, Landmark } from "lucide-react";
import { AdminHeading, LoadingRows, Metric, Status, TableShell } from "@/components/admin/AdminUI";
import { getAdminOverview, getAdminPayouts } from "@/services/adminService";
import { formatDateTime, formatNaira } from "@/utils/format";

export const Route = createFileRoute("/admin/finance")({ component: FinancePage });
function FinancePage() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: getAdminOverview });
  const payouts = useQuery({ queryKey: ["admin-payouts"], queryFn: getAdminPayouts });
  if (overview.isLoading || payouts.isLoading || !overview.data) return <LoadingRows />;
  return <><AdminHeading title="Finance" description="Monitor collected revenue, commission, and Paystack payouts." /><div className="mb-6 grid gap-3 sm:grid-cols-3"><Metric label="Gross sales" value={formatNaira(overview.data.grossSales)} detail="Paid customer orders" icon={<BadgeDollarSign className="h-5 w-5" />} /><Metric label="Vendura commission" value={formatNaira(overview.data.platformFees)} detail="Recorded platform fees" icon={<Landmark className="h-5 w-5" />} /><Metric label="Pending payouts" value={formatNaira(overview.data.pendingPayoutAmount)} detail={`${overview.data.pendingPayouts} requests`} icon={<Clock className="h-5 w-5" />} /></div><h2 className="mb-3 font-display text-lg font-bold">Payout history</h2><TableShell><table className="w-full min-w-[820px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Reference</th><th>Vendor</th><th>Destination</th><th>Amount</th><th>Status</th><th>Requested</th></tr></thead><tbody>{payouts.data?.map((payout) => <tr key={payout.id} className="border-t border-border"><td className="px-4 py-3 font-mono text-xs">{payout.reference}</td><td><p className="font-semibold">{payout.storeName}</p><p className="text-xs text-muted-foreground">{payout.vendorName}</p></td><td>{payout.bankAccount.bankName} · {payout.bankAccount.accountNumber.slice(-4)}</td><td className="font-semibold">{formatNaira(payout.amount)}</td><td><Status value={payout.status} /></td><td className="text-muted-foreground">{formatDateTime(payout.requestedAt)}</td></tr>)}</tbody></table>{payouts.data?.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No payout requests yet.</p>}</TableShell></>;
}
