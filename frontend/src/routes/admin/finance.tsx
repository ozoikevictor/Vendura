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
  updatePlatformBank,
} from "@/services/adminService";
import { getErrorMessage } from "@/services/api";
import { getNigerianBanks } from "@/services/vendorService";
import { formatDateTime, formatNaira } from "@/utils/format";

export const Route = createFileRoute("/admin/finance")({ component: FinancePage });

function FinancePage() {
  const queryClient = useQueryClient();
  const finance = useQuery({ queryKey: ["admin-finance"], queryFn: getAdminFinance });
  const payouts = useQuery({ queryKey: ["admin-payouts"], queryFn: getAdminPayouts });
  const banks = useQuery({
    queryKey: ["nigerian-banks"],
    queryFn: getNigerianBanks,
    staleTime: 86_400_000,
  });
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("Transfer Vendraza platform revenue to company bank account");
  const [bankForm, setBankForm] = useState({ bankCode: "", accountNumber: "" });
  const saveBank = useMutation({
    mutationFn: () => updatePlatformBank(bankForm),
    onSuccess: async () => {
      toast.success("Company bank account verified and saved");
      await queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Paystack could not verify this account")),
  });
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
  const { summary, ledger, bankAccount, recipientConfigured } = finance.data;

  return (
    <>
      <AdminHeading
        title="Platform Finance"
        description="Track Vendraza revenue separately from money owed to sellers."
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
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Withdraw Vendraza revenue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Only platform revenue can be transferred. Seller balances are protected.
          </p>
          {bankAccount ? (
            <div className="mt-4 rounded-md border border-success/30 bg-success/5 p-3 text-sm">
              <p className="font-semibold">{bankAccount.bankName}</p>
              <p className="text-muted-foreground">
                {bankAccount.accountName} · ****{bankAccount.accountNumber.slice(-4)} · Verified
              </p>
            </div>
          ) : (
            <form
              className="mt-4 space-y-3 rounded-md border border-border bg-background p-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!bankForm.bankCode || !/^\d{10}$/.test(bankForm.accountNumber)) {
                  toast.error("Select a bank and enter a valid 10-digit account number");
                  return;
                }
                saveBank.mutate();
              }}
            >
              <p className="text-sm font-semibold">Connect Vendraza company bank account</p>
              <select
                value={bankForm.bankCode}
                onChange={(event) =>
                  setBankForm((current) => ({ ...current, bankCode: event.target.value }))
                }
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              >
                <option value="">Select bank</option>
                {(banks.data ?? []).map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <input
                inputMode="numeric"
                maxLength={10}
                value={bankForm.accountNumber}
                onChange={(event) =>
                  setBankForm((current) => ({
                    ...current,
                    accountNumber: event.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder="10-digit account number"
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={saveBank.isPending || banks.isLoading}
                className="w-full rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
              >
                {saveBank.isPending ? "Verifying with Paystack..." : "Verify and save account"}
              </button>
            </form>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              withdrawal.mutate();
            }}
          >
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
        </div>
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
                  {entry.storeName ?? (entry.type === "platform_withdrawal" ? "Vendraza" : "-")}
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
