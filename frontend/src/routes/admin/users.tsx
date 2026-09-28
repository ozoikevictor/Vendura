import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminHeading, LoadingRows, Status, TableShell } from "@/components/admin/AdminUI";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
  type AdminUser,
} from "@/services/adminService";
import { getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { formatDate } from "@/utils/format";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

function UsersPage() {
  const client = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "suspended" }) =>
      updateAdminUserStatus(id, status),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Account status updated");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update account")),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "customer" | "vendor" | "admin" }) =>
      updateAdminUserRole(id, role),
    onSuccess: (user) => {
      client.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(
        user.role === "admin"
          ? "Administrator access granted. The user must sign in again."
          : "Administrator access removed. The user must sign in again.",
      );
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not update admin access")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      setDeleteTarget(null);
      client.invalidateQueries({ queryKey: ["admin-users"] });
      client.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Account deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not delete account")),
  });

  const busy = statusMutation.isPending || roleMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <AdminHeading
        title="Users"
        description="Manage customer, vendor, and administrator access."
      />
      {isLoading ? (
        <LoadingRows />
      ) : (
        <TableShell>
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Status</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="capitalize">{user.role}</td>
                    <td>{user.phone ?? "-"}</td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <Status value={user.status ?? "active"} />
                    </td>
                    <td className="pr-4">
                      <div className="flex items-center justify-end gap-2">
                        {!isCurrentUser && user.role !== "admin" && (
                          <>
                            <button
                              disabled={busy}
                              onClick={() =>
                                statusMutation.mutate({
                                  id: user.id,
                                  status: user.status === "suspended" ? "active" : "suspended",
                                })
                              }
                              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                            >
                              {user.status === "suspended" ? "Restore" : "Suspend"}
                            </button>
                            <button
                              disabled={busy}
                              onClick={() => roleMutation.mutate({ id: user.id, role: "admin" })}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Make admin
                            </button>
                          </>
                        )}
                        {!isCurrentUser && user.role === "admin" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              roleMutation.mutate({
                                id: user.id,
                                role: user.previousRole ?? (user.storeId ? "vendor" : "customer"),
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                            Remove admin
                          </button>
                        )}
                        {!isCurrentUser && (
                          <button
                            disabled={busy}
                            onClick={() => setDeleteTarget(user)}
                            aria-label={`Delete ${user.fullName}`}
                            title="Delete account"
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive-soft disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {isCurrentUser && (
                          <span className="text-xs font-medium text-muted-foreground">
                            Your account
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.fullName} will no longer be able to sign in.
              {deleteTarget &&
                (deleteTarget.role === "vendor" ||
                  deleteTarget.previousRole === "vendor" ||
                  deleteTarget.storeId) &&
                " Their storefront, products, orders, conversations, subscription, payouts, and related records will also be removed throughout the app."}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!deleteTarget || deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
