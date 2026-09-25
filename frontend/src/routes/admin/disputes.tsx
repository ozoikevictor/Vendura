import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import { AdminHeading, LoadingRows } from "@/components/admin/AdminUI";
import { getAdminDisputes, resolveAdminDispute } from "@/services/adminService";
import { getErrorMessage } from "@/services/api";
import { formatDateTime, formatNaira } from "@/utils/format";

export const Route = createFileRoute("/admin/disputes")({ component: DisputesPage });

function DisputesPage() {
  const client = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: getAdminDisputes,
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      resolution,
    }: {
      id: string;
      resolution: "release_to_vendor" | "refund_customer";
    }) => resolveAdminDispute(id, resolution, notes[id] ?? ""),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin-disputes"] });
      client.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Decision recorded and both parties notified");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not resolve dispute")),
  });
  function decide(id: string, resolution: "release_to_vendor" | "refund_customer") {
    const note = notes[id]?.trim();
    if (!note || note.length < 3) {
      toast.error("Add a decision note first");
      return;
    }
    const message =
      resolution === "refund_customer"
        ? "Initiate a real Paystack refund? Completion will wait for Paystack's webhook."
        : "Approve this order and make the seller earnings available?";
    if (window.confirm(message)) mutation.mutate({ id, resolution });
  }
  return (
    <>
      <AdminHeading
        title="Dispute Center"
        description="Review both sides and shipping evidence before releasing or refunding funds."
      />
      {isLoading ? (
        <LoadingRows />
      ) : data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="font-semibold">No disputes or timed-out confirmations</p>
        </div>
      ) : (
        <div className="space-y-5">
          {data.map((order) => (
            <section key={order.id} className="rounded-lg border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{order.orderNumber}</h2>
                <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
                  {order.status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Customer" value={order.customerName} />
                <Info label="Vendor" value={order.storeName} />
                <Info label="Amount" value={formatNaira(order.total)} />
                <Info label="Payment" value={order.paymentStatus} />
              </div>
              {order.shipment && (
                <div className="mt-4 rounded-md border bg-background p-4">
                  <h3 className="font-semibold">Vendor shipping evidence</h3>
                  <p className="mt-2 text-sm">
                    {order.shipment.deliveryMethod.replaceAll("_", " ")}{" "}
                    {order.shipment.carrierName ? `· ${order.shipment.carrierName}` : ""}{" "}
                    {order.shipment.trackingNumber ? `· ${order.shipment.trackingNumber}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.shipment.evidenceFiles.map((file) => (
                      <a
                        key={file.fileName}
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold"
                      >
                        <FileText className="h-4 w-4" />
                        {file.fileName}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {order.dispute && (
                <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                  <h3 className="font-semibold">Customer complaint</h3>
                  <p className="mt-1 text-sm font-medium">
                    {order.dispute.reason.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{order.dispute.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.dispute.evidenceFiles.map((file) => (
                      <a
                        key={file.fileName}
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border bg-card px-3 py-2 text-xs font-semibold"
                      >
                        {file.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4">
                <h3 className="font-semibold">Order timeline</h3>
                <div className="mt-2 space-y-1 text-sm">
                  {order.timeline.map((event, index) => (
                    <p key={`${event.status}-${index}`}>
                      <span className="font-medium">{event.status.replaceAll("_", " ")}</span> ·{" "}
                      {formatDateTime(event.at)} {event.note ? `· ${event.note}` : ""}
                    </p>
                  ))}
                </div>
              </div>
              <textarea
                value={notes[order.id] ?? ""}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [order.id]: event.target.value }))
                }
                placeholder="Required decision note for the audit log"
                className="mt-4 min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <button
                  disabled={mutation.isPending}
                  onClick={() => decide(order.id, "release_to_vendor")}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  Approve Vendor Payout
                </button>
                <button
                  disabled={mutation.isPending}
                  onClick={() => decide(order.id, "refund_customer")}
                  className="rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
                >
                  Approve Customer Refund
                </button>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold capitalize">{value}</p>
    </div>
  );
}
