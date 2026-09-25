import { useState } from "react";
import { Camera, FileText, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { EvidenceFile, Order } from "@/types";
import { submitShippingEvidence } from "@/services/orderService";
import { getErrorMessage } from "@/services/api";

export function ShippingEvidenceForm({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: (order: Order) => void;
}) {
  const [method, setMethod] = useState("courier");
  const [carrierName, setCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [saving, setSaving] = useState(false);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    for (const file of Array.from(list).slice(0, 4 - files.length)) {
      if (!accepted.includes(file.type) || file.size > 2_000_000) {
        toast.error(`${file.name} must be JPG, PNG, WebP, or PDF under 2 MB`);
        continue;
      }
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setFiles((current) => [
        ...current,
        {
          fileUrl,
          fileName: file.name,
          fileType: file.type as EvidenceFile["fileType"],
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    }
  }

  async function submit() {
    if (files.length === 0) {
      toast.error("Add at least one shipping receipt or package photo");
      return;
    }
    if (["courier", "transport_park"].includes(method) && !carrierName.trim()) {
      toast.error("Enter the courier or transport name");
      return;
    }
    if (
      !window.confirm(
        "Submit this evidence and mark the order as shipped? You cannot replace it after submission.",
      )
    )
      return;
    setSaving(true);
    try {
      const updated = await submitShippingEvidence(order.id, {
        deliveryMethod: method,
        shippingDate: new Date().toISOString(),
        evidenceFiles: files,
        ...(carrierName.trim() ? { carrierName: carrierName.trim() } : {}),
        ...(trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
        ...(note.trim() ? { additionalNote: note.trim() } : {}),
      });
      toast.success("Shipping evidence saved and the customer was notified");
      onSaved(updated);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save shipping evidence"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-foreground/45 p-3 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-lg bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Add Shipping Evidence</h2>
            <p className="text-sm text-muted-foreground">
              {order.orderNumber} · {order.customerName} · {order.deliveryAddress.city},{" "}
              {order.deliveryAddress.state}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Delivery method
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2.5"
            >
              <option value="transport_park">Transport / Park</option>
              <option value="courier">Courier / Logistics</option>
              <option value="local_delivery">Local Delivery</option>
              <option value="customer_pickup">Customer Pickup</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Transport / courier name
            <input
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="e.g. GUO Transport"
              className="mt-1 w-full rounded-md border border-input bg-background p-2.5"
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Waybill / tracking number
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Optional when none is provided"
              className="mt-1 w-full rounded-md border border-input bg-background p-2.5"
            />
          </label>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">Shipping evidence</p>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 p-4 text-sm font-semibold text-primary">
            <Camera className="h-4 w-4" /> Take photo or upload
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="sr-only"
            />
          </label>
          <div className="mt-2 space-y-2">
            {files.map((file, i) => (
              <div
                key={`${file.fileName}-${i}`}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{file.fileName}</span>
                <button
                  onClick={() => setFiles((current) => current.filter((_, index) => index !== i))}
                  aria-label={`Remove ${file.fileName}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <label className="mt-4 block text-sm font-medium">
          Additional note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            className="mt-1 w-full rounded-md border border-input bg-background p-2.5"
          />
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit Evidence & Mark as Shipped"}
          </button>
        </div>
      </div>
    </div>
  );
}
