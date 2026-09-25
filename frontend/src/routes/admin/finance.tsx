import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeDollarSign, Clock, Landmark, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AdminHeading, LoadingRows, Metric, Status, TableShell } from "@/components/admin/AdminUI";
import {
  createPlatformWithdrawal,
  getAdminFinance,
  getAdminPayouts,
} from "@/services/adminService";
import { getErrorMessage } from "@/services/api";
import { formatDateTime, formatNaira } from "@/utils/format";

export const Route = createFileRoute("/admin/finance")({ component: FinancePage });

function FinancePage() {
  const queryClient = useQueryClient();
  const finance = useQuery({ queryKey: ["admin-finance"], queryFn: getAdminFinance });
  const payouts = useQuery({ queryKey: ["admin-payouts"], queryFn: getAdminPayouts });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Transfer Vendura platform revenue to company bank account");
  const withdrawal = useMutation({
    mutationFn: () => createPlatformWithdrawal(Number(amount), note),
    onSuccess: async () => {
      toast.success("Platform withdrawal sent to Paystack");
      setAmount("");
      await queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not create the withdrawal")),
  });

  if (finance.isLoading || payouts.isLoading || !finance.data) return <LoadingRows />;
  const { summary, ledger, recipientConfigured } = finance.data;

  return (
    <>
      <AdminHeading
        title="Platform Finance"
        description="Track Vendura revenue separately from money owed to sellers."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Gross platform revenue"
          value={formatNaira(summary.grossRevenue)}
          detail="Commission and subscriptions"
          icon={<BadgeDollarSign className="h-5 w-5" />}
        />
        <Metric
          label="Available to withdraw"
          value={formatNaira(summary.withdrawable)}
          detail="After recorded costs and withdrawals"
          icon={<Landmark className="h-5 w-5" />}
        />
        <Metric
          label="Seller funds available"
          value={formatNaira(summary.sellerAvailable)}
          detail="Reserved for seller payouts"
          icon={<WalletCards className="h-5 w-5" />}
        />
        <Metric
          label="Seller funds pending"
          value={formatNaira(summary.sellerPending)}
          detail="Held until delivery confirmation"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Revenue breakdown</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <FinanceRow label="Order commissions" value={summary.commissions} />
            <FinanceRow label="Vendor subscriptions" value={summary.subscriptions} />
            <FinanceRow label="Processing fees" value={-summary.processingFees} />
            <FinanceRow label="Platform refunds" value={-summary.refunds} />
            <FinanceRow label="Already withdrawn" value={-summary.withdrawn} />
            <FinanceRow label="Pending seller payouts" value={-summary.pendingPayoutAmount} muted />
          </dl>
        </div>
        <form
          className="rounded-lg border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            withdrawal.mutate();
          }}
        >
          <h2 className="font-display text-lg font-bold">Withdraw Vendura revenue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only platform revenue can be transferred. Seller balances are protected.
          </p>
          {!recipientConfigured && (
            <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              Add PLATFORM_PAYSTACK_RECIPIENT_CODE in Render before making a withdrawal.
            </p>
          )}
          <label className="mt-4 block text-sm font-medium">
            Amount
            <input
              type="number"
              min="100"
              max={summary.withdrawable}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Transfer note
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={200}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={
              !recipientConfigured ||
              !amount ||
              Number(amount) > summary.withdrawable ||
              withdrawal.isPending
            }
            className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {withdrawal.isPending ? "Sending to Paystack..." : "Withdraw platform revenue"}
          </button>
        </form>
      </section>

      <h2 className="mb-3 font-display text-lg font-bold">Platform ledger</h2>
      <TableShell>
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Entry</th>
              <th>Vendor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Recorded</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((entry) => (
              <tr key={entry.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{entry.reference}</td>
                <td>
                  <p className="font-semibold capitalize">{entry.type.replaceAll("_", " ")}</p>
                  <p className="max-w-xs truncate text-xs text-muted-foreground">
                    {entry.description}
                  </p>
                </td>
                <td>
                  {entry.storeName ?? (entry.type === "platform_withdrawal" ? "Vendura" : "-")}
                </td>
                <td
                  className={
                    entry.amount < 0
                      ? "font-semibold text-destructive"
                      : "font-semibold text-success"
                  }
                >
                  {formatNaira(entry.amount)}
                </td>
                <td>
                  <Status value={entry.status ?? "recorded"} />
                </td>
                <td className="text-muted-foreground">{formatDateTime(entry.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ledger.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No finance entries yet.</p>
        )}
      </TableShell>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">Seller payout history</h2>
      <TableShell>
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Vendor</th>
              <th>Destination</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            {payouts.data?.map((payout) => (
              <tr key={payout.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{payout.reference}</td>
                <td>
                  <p className="font-semibold">{payout.storeName}</p>
                  <p className="text-xs text-muted-foreground">{payout.vendorName}</p>
                </td>
                <td>
                  {payout.bankAccount.bankName} · {payout.bankAccount.accountNumber.slice(-4)}
                </td>
                <td className="font-semibold">{formatNaira(payout.amount)}</td>
                <td>
                  <Status value={payout.status} />
                </td>
                <td className="text-muted-foreground">{formatDateTime(payout.requestedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </>
  );
}

function FinanceRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0">
      <dt className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</dt>
      <dd className="font-semibold">{formatNaira(value)}</dd>
    </div>
  );
}
