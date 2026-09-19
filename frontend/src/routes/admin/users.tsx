import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminHeading, LoadingRows, Status, TableShell } from "@/components/admin/AdminUI";
import { getAdminUsers, updateAdminUserStatus } from "@/services/adminService";
import { getErrorMessage } from "@/services/api";
import { formatDate } from "@/utils/format";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });
function UsersPage() {
  const client = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: getAdminUsers });
  const mutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: "active" | "suspended" }) => updateAdminUserStatus(id, status), onSuccess: () => { client.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Account status updated"); }, onError: (error) => toast.error(getErrorMessage(error, "Could not update account")) });
  return <><AdminHeading title="Users" description="Manage customer, vendor, and administrator access." />{isLoading ? <LoadingRows /> : <TableShell><table className="w-full min-w-[780px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Name</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th className="pr-4 text-right">Action</th></tr></thead><tbody>{data.map((user) => <tr key={user.id} className="border-t border-border"><td className="px-4 py-3"><p className="font-semibold">{user.fullName}</p><p className="text-xs text-muted-foreground">{user.email}</p></td><td className="capitalize">{user.role}</td><td>{user.phone ?? "—"}</td><td>{formatDate(user.createdAt)}</td><td><Status value={user.status ?? "active"} /></td><td className="pr-4 text-right">{user.role !== "admin" && <button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: user.id, status: user.status === "suspended" ? "active" : "suspended" })} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50">{user.status === "suspended" ? "Restore" : "Suspend"}</button>}</td></tr>)}</tbody></table></TableShell>}</>;
}
