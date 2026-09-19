import { useState } from "react";
import { ShieldCheck, Clock, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import type { Order } from "@/types";
import { EscrowBadge } from "./EscrowBadge";
import { confirmDeliveryAndRelease, openEscrowDispute } from "@/services/orderService";
import { formatNaira, formatDateTime } from "@/utils/format";

function hoursLeft(iso?: string) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 3_600_000);
}

/**
 * Customer-facing buyer protection panel. All money movement happens on the
 * backend — this only requests a release or opens a dispute.
 */
export function EscrowPanel({ order, onUpdated }: { order: Order; onUpdated?: (o: Order) => void }) {
  const [loading, setLoading] = useState<"release" | "dispute" | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState("");
  const escrow = order.escrow;
  if (!escrow) return null;

  const left = hoursLeft(escrow.autoReleaseAt);
  const canAct = escrow.status === "held";

  const release = async () => {
    setLoading("release");
    try {
      const updated = await confirmDeliveryAndRelease(order.id);
      onUpdated?.(updated);
      toast.success("Delivery confirmed — payment released to the seller.");
    } catch {
      toast.error("Could not confirm delivery. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const dispute = async () => {
    if (!reason.trim()) return;
    setLoading("dispute");
    try {
      const updated = await openEscrowDispute(order.id, reason.trim());
      onUpdated?.(updated);
      setShowDispute(false);
      setReason("");
      toast.success("Dispute opened. Your payment stays held while we review it.");
    } catch {
      toast.error("Could not open the dispute. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="mt-4 rounded-xl border border-primary/25 bg-primary-soft/40 p-5" aria-label="Buyer protection">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Vendura Buyer Protection
        </h2>
        <EscrowBadge status={escrow.status} />
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {escrow.status === "held" && (
          <>We're holding <span className="font-semibold text-foreground">{formatNaira(escrow.amount)}</span> safely. The seller is only paid after you confirm your order arrived as described.</>
        )}
        {escrow.status === "not_funded" && <>Your payment isn't held yet. Once you pay, we keep the money safe until delivery is confirmed.</>}
        {escrow.status === "released" && (
          <>You confirmed delivery, so {formatNaira(escrow.amount)} was released to the seller{escrow.releasedAt ? ` on ${formatDateTime(escrow.releasedAt)}` : ""}.</>
        )}
        {escrow.status === "refunded" && <>This order was cancelled and {formatNaira(escrow.amount)} was returned to you.</>}
        {escrow.status === "disputed" && (
          <>Your payment is frozen while our team reviews the dispute{escrow.disputeReason ? `: "${escrow.disputeReason}"` : ""}.</>
        )}
      </p>

      {escrow.status === "held" && left !== null && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Auto-releases to the seller in {left} hour{left === 1 ? "" : "s"} if you don't respond.
        </p>
      )}

      {canAct && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={release}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {loading === "release" ? "Releasing…" : "Confirm Delivery & Release Payment"}
          </button>
          <button
            type="button"
            onClick={() => setShowDispute((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            aria-expanded={showDispute}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Report a Problem
          </button>
        </div>
      )}

      {showDispute && (
        <div className="mt-3 rounded-xl border border-destructive/30 bg-card p-4">
          <label htmlFor="dispute-reason" className="text-sm font-medium text-foreground">
            What went wrong?
          </label>
          <textarea
            id="dispute-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Item is different from the description"
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={dispute}
              disabled={loading !== null || !reason.trim()}
              className="rounded-lg bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
            >
              {loading === "dispute" ? "Submitting…" : "Open Dispute"}
            </button>
            <button
              type="button"
              onClick={() => setShowDispute(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
