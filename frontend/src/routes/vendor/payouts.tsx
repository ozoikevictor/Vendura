import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getVendorBalance, getTransactions, getPayouts, getBankAccount,
  getNigerianBanks, updateBankAccount, requestPayout,
} from "@/services/vendorService";
import { formatNaira, formatDateTime } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/services/api";

export const Route = createFileRoute("/vendor/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts — Vendor — Vendura" },
      { name: "description", content: "Balance, transactions, and payouts." },
      { property: "og:title", content: "Payouts — Vendura" },
      { property: "og:description", content: "Balance, transactions, and payouts." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorPayoutsPage,
});

function VendorPayoutsPage() {
  const queryClient = useQueryClient();
  const [showBank, setShowBank] = useState(false);
  const [bankForm, setBankForm] = useState({ bankCode: "", accountNumber: "" });
  const [savingBank, setSavingBank] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const { data: balance } = useQuery({ queryKey: ["vendor-balance"], queryFn: getVendorBalance });
  const { data: txns } = useQuery({ queryKey: ["vendor-transactions"], queryFn: () => getTransactions("user-vendor-1") });
  const { data: payouts } = useQuery({ queryKey: ["vendor-payouts"], queryFn: () => getPayouts("user-vendor-1") });
  const { data: bank } = useQuery({ queryKey: ["vendor-bank"], queryFn: getBankAccount });
  const { data: banks = [], isLoading: banksLoading } = useQuery({ queryKey: ["nigerian-banks"], queryFn: getNigerianBanks, staleTime: 86400000 });

  async function handleRequestPayout() {
    if (!bank) { toast.error("Add a bank account before requesting a payout"); setShowBank(true); return; }
    if (!bank.verified) { toast.error("Your bank account must be verified before payout"); return; }
    if (!balance || balance.available <= 0) { toast.error("No available balance yet"); return; }
    setRequesting(true);
    try {
      await requestPayout(balance.available, bank);
      queryClient.invalidateQueries({ queryKey: ["vendor-payouts"] });
      toast.success("Payout sent to Paystack for processing");
      queryClient.invalidateQueries({ queryKey: ["vendor-balance"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-transactions"] });
    } catch (error) { toast.error(getErrorMessage(error, "Failed to request payout")); } finally { setRequesting(false); }
  }

  async function handleSaveBank() {
    if (!bankForm.bankCode || !/^\d{10}$/.test(bankForm.accountNumber)) {
      toast.error("Select a bank and enter a valid 10-digit account number");
      return;
    }
    setSavingBank(true);
    try {
      await updateBankAccount(bankForm);
      queryClient.invalidateQueries({ queryKey: ["vendor-bank"] });
      toast.success("Bank account verified and saved");
      setShowBank(false);
    } catch (error) { toast.error(getErrorMessage(error, "Paystack could not verify this account")); }
    finally { setSavingBank(false); }
  }

  if (!balance || bank === undefined) return <div className="h-64 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Payouts & Billing</h1>
        <p className="text-sm text-muted-foreground">Balance, transactions, and payout history</p>
      </div>

      {/* Balance cards */}
      <div className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="min-w-0 rounded-xl border border-primary/30 bg-primary-soft p-4">
          <div className="flex items-center gap-1.5 text-primary"><Wallet className="h-4 w-4" /><span className="text-xs">Available</span></div>
          <p className="mt-1 break-words text-lg font-bold text-foreground sm:text-xl">{formatNaira(balance.available)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-4 w-4" /><span className="text-xs">Pending</span></div>
          <p className="mt-1 break-words text-lg font-bold text-foreground sm:text-xl">{formatNaira(balance.pending)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Customer Paid</div>
          <p className="mt-1 break-words text-lg font-bold text-foreground sm:text-xl">{formatNaira(balance.customerPayments)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total Sales</div>
          <p className="mt-1 break-words text-lg font-bold text-foreground sm:text-xl">{formatNaira(balance.totalSales)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Delivery Collected</div>
          <p className="mt-1 break-words text-lg font-bold text-foreground sm:text-xl">{formatNaira(balance.deliveryFees)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Vendura Fee (5%)</div>
          <p className="mt-1 break-words text-lg font-bold text-foreground sm:text-xl">{formatNaira(balance.platformFees)}</p>
        </div>
      </div>

      {/* Request payout + bank */}
      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{bank ? `Bank: ${bank.bankName}` : "No bank account added"}</p>
          <p className="break-words text-xs text-muted-foreground">{bank ? <>{bank.accountNumber} · {bank.accountName} {bank.verified ? <span className="text-success">✓ Verified</span> : <span className="text-warning-foreground">Awaiting verification</span>}</> : "Add your Nigerian bank account to receive payouts."}</p>
        </div>
        <button onClick={() => { if (bank) setBankForm({ bankCode: bank.bankCode ?? "", accountNumber: bank.accountNumber }); setShowBank((v) => !v); }} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent sm:w-auto">
          <Building2 className="h-4 w-4" /> {bank ? "Edit Bank" : "Add Bank"}
        </button>
        <button onClick={handleRequestPayout} disabled={requesting || !bank?.verified || balance.available <= 0} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {requesting ? "Requesting..." : `Request Payout (${formatNaira(balance.available)})`}
        </button>
      </div>

      {/* Bank edit form */}
      {showBank && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <select value={bankForm.bankCode} onChange={(e) => setBankForm((f) => ({ ...f, bankCode: e.target.value }))} disabled={banksLoading} className="min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">{banksLoading ? "Loading banks..." : "Select bank"}</option>
              {banks.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
            <input value={bankForm.accountNumber} onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="10-digit account number" inputMode="numeric" className="min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">Paystack will confirm the account name before these details are saved.</p>
          <div className="flex gap-2">
            <button onClick={handleSaveBank} disabled={savingBank} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{savingBank ? "Verifying..." : "Verify & Save"}</button>
            <button onClick={() => setShowBank(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent">Cancel</button>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Transactions</h2>
        <div className="mt-3 divide-y divide-border">
          {txns?.map((t) => (
            <div key={t.id} className="flex min-w-0 items-start justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-foreground">{t.description}</p>
                <p className="break-all text-xs text-muted-foreground">{formatDateTime(t.createdAt)} · {t.reference}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-sm font-semibold", t.amount >= 0 ? "text-success" : "text-destructive")}>{t.amount >= 0 ? "+" : ""}{formatNaira(t.amount)}</p>
                {t.status && <p className="text-xs capitalize text-muted-foreground">{t.status}</p>}
              </div>
            </div>
          ))}
          {txns?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sales and fees will appear here after a successful payment.</p>}
        </div>
      </div>

      {/* Payout history */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Payout History</h2>
        <div className="mt-3 divide-y divide-border">
          {payouts?.map((p) => (
            <div key={p.id} className="flex min-w-0 items-start justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-start gap-2">
                {p.status === "paid" ? <CheckCircle2 className="h-4 w-4 text-success" /> : p.status === "failed" ? <XCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{formatNaira(p.amount)}</p>
                  <p className="break-all text-xs text-muted-foreground">{p.reference} · {formatDateTime(p.requestedAt)}</p>
                </div>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", p.status === "paid" ? "bg-success-soft text-success" : p.status === "failed" ? "bg-destructive-soft text-destructive" : "bg-warning-soft text-warning-foreground")}>{p.status}</span>
            </div>
          ))}
          {payouts?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No payouts requested yet.</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Paid orders remain pending until the customer confirms delivery. Paystack sends verified payouts to the saved bank account and reports the final status here.</p>
    </div>
  );
}
