import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DeliveryManagement } from "@/components/orders/DeliveryManagement";
import { api, getErrorMessage } from "@/services/api";
export const Route = createFileRoute("/admin/logistics")({ component: AdminLogistics });
function AdminLogistics() {
  const logs = useQuery({
    queryKey: ["logistics-logs"],
    queryFn: () =>
      api<Array<{ id: string; action: string; message: string; createdAt: string }>>(
        "/logistics/logs",
      ),
    retry: false,
  });
  return (
    <div className="space-y-8">
      <DeliveryManagement admin />
      <section>
        <h2 className="text-lg font-semibold">Operational logs</h2>
        {logs.error && (
          <p role="alert" className="text-sm text-destructive">
            {getErrorMessage(logs.error, "Unable to load logs.")}
          </p>
        )}
        {logs.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No delivery errors recorded.</p>
        )}
        {logs.data?.map((log) => (
          <div key={log.id} className="mt-3 border-b border-border pb-3 text-sm">
            <p className="font-semibold">{log.action.replaceAll("_", " ")}</p>
            <p className="text-muted-foreground">{log.message}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
