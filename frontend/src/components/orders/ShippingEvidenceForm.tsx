import { useState } from "react";
import { Camera, FileText, ImagePlus, Trash2, X } from "lucide-react";
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
  const [error, setError] = useState("");

  function showError(message: string) {
    setError(message);
    toast.error(message);
  }

  async function addFiles(
    list: FileList | null,
    evidenceType: NonNullable<EvidenceFile["evidenceType"]>,
  ) {
    if (!list) return;
    setError("");
    for (const file of Array.from(list).slice(0, 4 - files.length)) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        showError(`${file.name} must be a photo or PDF`);
        continue;
      }
      if (evidenceType === "package_photo" && isPdf) {
        showError("The package photo must be a real JPG, PNG, or WebP image");
        continue;
      }
      let prepared: PreparedUpload;
      try {
        prepared = isImage ? await preparePhonePhoto(file) : await prepareDocument(file);
      } catch (caught) {
        showError(caught instanceof Error ? caught.message : `Could not read ${file.name}`);
        continue;
      }
      setFiles((current) => [
        ...current,
        {
          evidenceType,
          fileUrl: prepared.fileUrl,
          fileName: prepared.fileName,
          fileType: prepared.fileType,
          fileSize: prepared.fileSize,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    }
  }

  async function submit() {
    setError("");
    if (files.length === 0) {
      showError("Add at least one shipping receipt or package photo");
      return;
    }
    if (!files.some((file) => file.evidenceType === "package_photo")) {
      showError("Take or upload a clear photo of the packed product");
      return;
    }
    if (["courier", "transport_park"].includes(method) && !carrierName.trim()) {
      showError("Enter the courier or transport name");
      return;
    }
    if (["courier", "transport_park"].includes(method) && !trackingNumber.trim()) {
      showError("Enter the waybill or tracking number from the receipt");
      return;
    }
    if (
      ["courier", "transport_park"].includes(method) &&
      !files.some((file) => file.evidenceType === "shipping_document")
    ) {
      showError("Upload the courier receipt or waybill as a separate document");
      return;
    }
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
      showError(getErrorMessage(error, "Could not save shipping evidence"));
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
          <button type="button" onClick={onClose} aria-label="Close">
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
          <p className="mt-1 text-xs text-muted-foreground">
            A package photo is required. Courier and park deliveries also require a receipt or
            waybill.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 p-4 text-sm font-semibold text-primary">
              <Camera className="h-4 w-4" /> Take Package Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => addFiles(e.target.files, "package_photo")}
                className="sr-only"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 p-4 text-sm font-semibold text-primary">
              <ImagePlus className="h-4 w-4" /> Upload From Phone
              <input
                type="file"
                accept="image/*"
                onChange={(e) => addFiles(e.target.files, "package_photo")}
                className="sr-only"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border p-4 text-sm font-semibold sm:col-span-2">
              <FileText className="h-4 w-4" /> Upload Receipt / Waybill
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={(e) => addFiles(e.target.files, "shipping_document")}
                className="sr-only"
              />
            </label>
          </div>
          <div className="mt-2 space-y-2">
            {files.map((file, i) => (
              <div
                key={`${file.fileName}-${i}`}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <FileText className="h-5 w-5 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{file.fileName}</span>
                <span className="hidden text-xs capitalize text-muted-foreground sm:inline">
                  {file.evidenceType?.replaceAll("_", " ")}
                </span>
                <button
                  type="button"
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
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
          >
            {error}
          </div>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
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

type PreparedUpload = Pick<EvidenceFile, "fileUrl" | "fileName" | "fileType" | "fileSize">;

async function prepareDocument(file: File): Promise<PreparedUpload> {
  if (file.size > 2_000_000) throw new Error(`${file.name} must be under 2 MB`);
  return {
    fileUrl: await readAsDataUrl(file),
    fileName: file.name,
    fileType: "application/pdf",
    fileSize: file.size,
  };
}

async function preparePhonePhoto(file: File): Promise<PreparedUpload> {
  const image = await loadImage(file);
  if (image.naturalWidth < 640 || image.naturalHeight < 480) {
    throw new Error(`${file.name} is too small. Use a clear photo at least 640 × 480.`);
  }
  const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.84;
  let fileUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrlSize(fileUrl) > 2_000_000 && quality > 0.42) {
    quality -= 0.08;
    fileUrl = canvas.toDataURL("image/jpeg", quality);
  }
  const fileSize = dataUrlSize(fileUrl);
  if (fileSize > 2_000_000)
    throw new Error("This photo is too large to prepare. Try another photo.");
  return {
    fileUrl,
    fileName: `${file.name.replace(/\.[^.]+$/, "") || "package-photo"}.jpg`,
    fileType: "image/jpeg",
    fileSize,
  };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} could not be read. Choose a JPEG, PNG, or WebP photo.`));
    };
    image.src = url;
  });
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlSize(value: string) {
  return Math.ceil(((value.split(",")[1]?.length ?? 0) * 3) / 4);
}
