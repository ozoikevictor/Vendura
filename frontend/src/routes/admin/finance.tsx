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
  updateAdminPayout,
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
  const [payoutNote, setPayoutNote] = useState("");
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
  const payoutAction = useMutation({
    mutationFn: ({ payoutId, status }: { payoutId: string; status: "paid" | "failed" }) =>
      updateAdminPayout(payoutId, status, payoutNote || undefined),
    onSuccess: async (_result, variables) => {
      toast.success(
        variables.status === "paid"
          ? "Seller payout marked as paid"
          : "Seller payout declined and balance released",
      );
      setPayoutNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payouts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-finance"] }),
      ]);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update seller payout")),
  });

  if (finance.isLoading || payouts.isLoading || !finance.data) return <LoadingRows />;
  const { summary, ledger, bankAccount, recipientConfigured } = finance.data;
  const pendingPayouts = (payouts.data ?? []).filter((payout) =>
    ["pending", "processing"].includes(payout.status),
  );

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

      <section className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Vendor payout requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay these vendors from your bank app, then come back here to confirm the payment.
            </p>
          </div>
          <div className="rounded-md bg-card px-3 py-2 text-sm font-semibold text-primary shadow-sm">
            {pendingPayouts.length} waiting
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium">
          Payment note
          <input
            value={payoutNote}
            onChange={(event) => setPayoutNote(event.target.value)}
            maxLength={300}
            placeholder="Example: Paid by bank transfer, receipt saved"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
          />
        </label>

        {pendingPayouts.length > 0 ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {pendingPayouts.map((payout) => (
              <div
                key={payout.id}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {payout.reference}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-bold">
                      {formatNaira(payout.amount)}
                    </h3>
                  </div>
                  <Status value={payout.status} />
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <PayoutDetail label="Store" value={payout.storeName} />
                  <PayoutDetail label="Vendor" value={payout.vendorName} />
                  <PayoutDetail label="Bank" value={payout.bankAccount.bankName} />
                  <PayoutDetail label="Account name" value={payout.bankAccount.accountName} />
                  <PayoutDetail label="Account number" value={payout.bankAccount.accountNumber} />
                  <PayoutDetail label="Requested" value={formatDateTime(payout.requestedAt)} />
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={payoutAction.isPending}
                    onClick={() => payoutAction.mutate({ payoutId: payout.id, status: "paid" })}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Mark as paid
                  </button>
                  <button
                    type="button"
                    disabled={payoutAction.isPending}
                    onClick={() => payoutAction.mutate({ payoutId: payout.id, status: "failed" })}
                    className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                  >
                    Decline and return balance
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No vendor payout request is waiting right now.
          </div>
        )}
      </section>

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

      <h2 className="mb-3 mt-8 font-display text-lg font-bold">All vendor payouts</h2>
      <TableShell>
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th>Vendor</th>
              <th>Destination</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Action</th>
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
                  <p className="font-semibold">{payout.bankAccount.bankName}</p>
                  <p className="text-xs text-muted-foreground">
                    {payout.bankAccount.accountName} · {payout.bankAccount.accountNumber}
                  </p>
                </td>
                <td className="font-semibold">{formatNaira(payout.amount)}</td>
                <td>
                  <Status value={payout.status} />
                </td>
                <td className="text-muted-foreground">{formatDateTime(payout.requestedAt)}</td>
                <td>
                  {["pending", "processing"].includes(payout.status) ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={payoutAction.isPending}
                        onClick={() => payoutAction.mutate({ payoutId: payout.id, status: "paid" })}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Mark paid
                      </button>
                      <button
                        type="button"
                        disabled={payoutAction.isPending}
                        onClick={() =>
                          payoutAction.mutate({ payoutId: payout.id, status: "failed" })
                        }
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Closed</span>
                  )}
                </td>
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

function PayoutDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold text-foreground">{value}</p>
    </div>
  );
}
