import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminHeading, LoadingRows, Status, TableShell } from "@/components/admin/AdminUI";
import { getAdminStores, updateStoreVerification } from "@/services/adminService";
import { getErrorMessage } from "@/services/api";
import { formatNaira } from "@/utils/format";

export const Route = createFileRoute("/admin/vendors")({ component: VendorsPage });
function VendorsPage() {
  const client = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-stores"], queryFn: getAdminStores });
  const mutation = useMutation({ mutationFn: ({ id, verified }: { id: string; verified: boolean }) => updateStoreVerification(id, verified), onSuccess: () => { client.invalidateQueries({ queryKey: ["admin-stores"] }); client.invalidateQueries({ queryKey: ["admin-overview"] }); toast.success("Store verification updated"); }, onError: (error) => toast.error(getErrorMessage(error, "Could not update store")) });
  return <><AdminHeading title="Vendors" description="Verify storefronts and monitor seller activity." />{isLoading ? <LoadingRows /> : <TableShell><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Store</th><th>Owner</th><th>Products</th><th>Orders</th><th>Paid sales</th><th>Status</th><th className="pr-4 text-right">Action</th></tr></thead><tbody>{data.map((store) => <tr key={store.id} className="border-t border-border"><td className="px-4 py-3"><p className="font-semibold">{store.name}</p><p className="text-xs text-muted-foreground">/{store.slug}</p></td><td><p>{store.owner.fullName ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{store.owner.email}</p></td><td>{store.productCount}</td><td>{store.orderCount}</td><td>{formatNaira(store.sales)}</td><td><Status value={store.verified ? "verified" : "unverified"} /></td><td className="pr-4 text-right"><button disabled={mutation.isPending} onClick={() => mutation.mutate({ id: store.id, verified: !store.verified })} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50">{store.verified ? "Remove verification" : "Verify store"}</button></td></tr>)}</tbody></table></TableShell>}</>;
}
