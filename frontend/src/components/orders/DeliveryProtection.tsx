import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { EvidenceFile, Order } from "@/types";
import {
  confirmDeliveryAndRelease,
  reportOrderProblem,
  reportSeller,
} from "@/services/orderService";
import { getErrorMessage } from "@/services/api";
import { formatDateTime } from "@/utils/format";

export function DeliveryProtection({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: (order: Order) => void;
}) {
  const [mode, setMode] = useState<"confirm" | "problem" | "report" | null>(null);
  const [reason, setReason] = useState("not_received");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [busy, setBusy] = useState(false);
  const canAct = ["shipped", "awaiting_delivery_confirmation"].includes(order.status);
  async function evidence(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list).slice(0, 4 - files.length)) {
      if (
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) ||
        file.size > 2_000_000
      ) {
        toast.error("Evidence must be JPG, PNG, WebP, or PDF under 2 MB");
        continue;
      }
      const fileUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      setFiles((items) => [
        ...items,
        {
          fileUrl,
          fileName: file.name,
          fileType: file.type as EvidenceFile["fileType"],
          fileSize: file.size,
        },
      ]);
    }
  }
  async function confirm() {
    setBusy(true);
    try {
      const updated = await confirmDeliveryAndRelease(order.id);
      onUpdated(updated);
      toast.success("Receipt confirmed. The seller payout is now eligible.");
      setMode(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not confirm delivery"));
    } finally {
      setBusy(false);
    }
  }
  async function dispute() {
    if (description.trim().length < 10) {
      toast.error("Describe the problem in at least 10 characters");
      return;
    }
    setBusy(true);
    try {
      const updated = await reportOrderProblem(order.id, {
        reason,
        description: description.trim(),
        evidenceFiles: files,
      });
      onUpdated(updated);
      toast.success("Problem reported. The payout is frozen for admin review.");
      setMode(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not report the problem"));
    } finally {
      setBusy(false);
    }
  }
  async function sellerReport() {
    if (description.trim().length < 10) {
      toast.error("Explain what the seller asked you to do");
      return;
    }
    setBusy(true);
    try {
      await reportSeller(order.id, description.trim());
      toast.success("Seller report sent to Vendura");
      setMode(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not report the seller"));
    } finally {
      setBusy(false);
    }
  }
  if (!canAct && !["disputed", "awaiting_admin_review", "refund_processing"].includes(order.status))
    return null;
  return (
    <section className="mt-4 rounded-lg border border-warning/40 bg-card p-4">
      <div className="flex gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
        <div>
          <h2 className="font-semibold">Never confirm before receiving your order</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A seller should never ask you to confirm before the product is physically with you.
          </p>
          {order.confirmationDeadline && (
            <p className="mt-1 text-xs font-medium">
              Response deadline: {formatDateTime(order.confirmationDeadline)}
            </p>
          )}
        </div>
      </div>
      {canAct && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setMode("confirm")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            I Received My Order
          </button>
          <button
            onClick={() => setMode("problem")}
            className="rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive"
          >
            Report a Problem
          </button>
          <button
            onClick={() => {
              setDescription("");
              setMode("report");
            }}
            className="rounded-md border px-4 py-2 text-sm font-semibold"
          >
            Report Seller
          </button>
        </div>
      )}
      {mode === "confirm" && (
        <div className="mt-4 rounded-md border bg-background p-4">
          <h3 className="font-semibold">Confirm Order Received</h3>
          <p className="mt-2 text-sm">
            Only continue if the product is physically in your possession. Confirming receipt starts
            the vendor payout process.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              onClick={confirm}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <ShieldCheck className="mr-1 inline h-4 w-4" />
              Yes, I Have Received It
            </button>
            <button onClick={() => setMode(null)} className="rounded-md border px-3 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {(mode === "problem" || mode === "report") && (
        <div className="mt-4 space-y-3 rounded-md border bg-background p-4">
          {mode === "problem" && (
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-input bg-card p-2.5"
            >
              <option value="not_received">I have not received the product</option>
              <option value="seller_did_not_ship">Seller did not ship</option>
              <option value="wrong_product">Wrong product received</option>
              <option value="not_as_described">Significantly differs from listing</option>
              <option value="incomplete_package">Empty or incomplete package</option>
              <option value="damaged">Damaged product</option>
              <option value="suspected_fraud">Suspected fraud</option>
              <option value="other">Other</option>
            </select>
          )}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={
              mode === "report"
                ? "Explain what the seller asked you to do"
                : "Describe what happened"
            }
            className="w-full rounded-md border border-input bg-card p-2.5"
          />
          {mode === "problem" && (
            <label className="block cursor-pointer rounded-md border border-dashed p-3 text-center text-sm font-medium">
              Add evidence
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                multiple
                className="sr-only"
                onChange={(e) => evidence(e.target.files)}
              />
            </label>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={mode === "problem" ? dispute : sellerReport}
              className="rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"
            >
              Submit Report
            </button>
            <button onClick={() => setMode(null)} className="rounded-md border px-3 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
