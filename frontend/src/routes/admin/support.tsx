import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminHeading, LoadingRows } from "@/components/admin/AdminUI";
import { getSupportRequests, updateSupportRequest, type SupportRequest } from "@/services/adminService";
import { getErrorMessage } from "@/services/api";
import { formatDateTime } from "@/utils/format";

export const Route = createFileRoute("/admin/support")({ component: SupportPage });
function SupportPage() {
  const client = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ["admin-support"], queryFn: getSupportRequests, retry: false });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportRequest["status"] }) => updateSupportRequest(id, status),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["admin-support"] }); toast.success("Support status updated"); },
    onError: (err) => toast.error(getErrorMessage(err, "Could not update the request")),
  });
  return <>
    <AdminHeading title="Support messages" description="Messages submitted through the contact form." />
    {isLoading ? <LoadingRows /> : error ? <div role="alert" className="rounded-lg border border-border bg-card p-6"><p className="font-semibold">Unable to load support messages</p><p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error, "Please check your connection and try again.")}</p><button type="button" disabled={isFetching} onClick={() => void refetch()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{isFetching ? "Retrying..." : "Try again"}</button></div> : !data?.length ? <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">No support messages yet.</p> : <div className="space-y-4">{data.map((request) => <article key={request.id} className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{request.subject}</h2><p className="mt-1 text-sm text-muted-foreground">{request.name} · {request.email}</p><p className="mt-1 text-xs text-muted-foreground">{request.reference} · {request.category} · {formatDateTime(request.createdAt)}</p></div><label className="text-sm">Status <select aria-label={`Status for ${request.reference}`} className="ml-2 rounded-md border border-input bg-background p-2" value={request.status} disabled={update.isPending} onChange={(event) => update.mutate({ id: request.id, status: event.target.value as SupportRequest["status"] })}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label></div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm">{request.message}</p>
    </article>)}</div>}
  </>;
}
