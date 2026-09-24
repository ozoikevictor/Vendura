import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendorConversations, removeConversation } from "@/services/messageService";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataLoader } from "@/components/shared/DataLoader";
import { CURRENT_VENDOR_STORE_ID } from "@/data/stores";
import { timeAgo } from "@/utils/format";
import { toast } from "sonner";

export const Route = createFileRoute("/vendor/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — Vendor — Vendura" },
      { name: "description", content: "Chat with customers." },
      { property: "og:title", content: "Messages — Vendura" },
      { property: "og:description", content: "Chat with customers." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorMessagesPage,
});

function VendorMessagesPage() {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["vendor-conversations"],
    queryFn: () => getVendorConversations(CURRENT_VENDOR_STORE_ID),
    refetchInterval: 3_000,
    refetchOnWindowFocus: "always",
  });
  const remove = useMutation({
    mutationFn: removeConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-conversations"] });
      toast.success("Conversation removed from your history");
    },
    onError: () => toast.error("Conversation could not be removed"),
  });

  if (isLoading) {
    return <DataLoader label="Loading messages" className="min-h-72" />;
  }

  if (!conversations || conversations.length === 0) {
    return <EmptyState icon={<MessageSquare className="h-7 w-7" />} title="No messages" description="Customer conversations will appear here." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">{conversations.length} conversations</p>
      </div>
      <div className="space-y-2">
        {conversations.map((conv) => (
          <div key={conv.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
            <Link to="/vendor/messages/$conversationId" params={{ conversationId: conv.id }} className="flex min-w-0 flex-1 items-center gap-3">
            <img src={conv.productImage} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{conv.customerName}</p>
                <span className="text-xs text-muted-foreground">{timeAgo(conv.lastMessageAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{conv.productName}</p>
              <p className="mt-0.5 text-sm text-foreground line-clamp-1">{conv.lastMessage}</p>
            </div>
            {conv.unreadForVendor > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{conv.unreadForVendor}</span>
            )}
            </Link>
            <button type="button" title="Remove conversation" aria-label={`Remove conversation with ${conv.customerName}`} disabled={remove.isPending} onClick={() => { if (window.confirm("Remove this conversation from your history?")) remove.mutate(conv.id); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
