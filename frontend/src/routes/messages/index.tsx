import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, Trash2 } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataLoader } from "@/components/shared/DataLoader";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCustomerConversations, removeConversation } from "@/services/messageService";
import { useAuthStore } from "@/store/auth";
import { timeAgo } from "@/utils/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — Vendura" },
      { name: "description", content: "Chat with sellers on Vendura." },
      { property: "og:title", content: "Messages — Vendura" },
      { property: "og:description", content: "Chat with sellers on Vendura." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["customer-conversations"],
    queryFn: () => getCustomerConversations(user?.id ?? "user-cust-1"),
    refetchInterval: 3_000,
    refetchOnWindowFocus: "always",
  });
  const remove = useMutation({
    mutationFn: removeConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-conversations"] });
      toast.success("Conversation removed from your history");
    },
    onError: () => toast.error("Conversation could not be removed"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <DataLoader label="Loading messages" className="min-h-[60dvh]" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <EmptyState
          icon={<MessageSquare className="h-7 w-7" />}
          title="No messages yet"
          description="Start a conversation by messaging a seller from a product page."
          action={<Link to="/marketplace" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse Marketplace</Link>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
        <div className="mt-4 space-y-2">
          {conversations.map((conv) => (
            <div key={conv.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
              <Link to="/messages/$conversationId" params={{ conversationId: conv.id }} className="flex min-w-0 flex-1 items-center gap-3">
              <img src={conv.productImage} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{conv.storeName}</p>
                  <span className="text-xs text-muted-foreground">{timeAgo(conv.lastMessageAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{conv.productName}</p>
                <p className="mt-0.5 text-sm text-foreground line-clamp-1">{conv.lastMessage}</p>
              </div>
              {conv.unreadForCustomer > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {conv.unreadForCustomer}
                </span>
              )}
              </Link>
              <button type="button" title="Remove conversation" aria-label={`Remove conversation with ${conv.storeName}`} disabled={remove.isPending} onClick={() => { if (window.confirm("Remove this conversation from your history?")) remove.mutate(conv.id); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
