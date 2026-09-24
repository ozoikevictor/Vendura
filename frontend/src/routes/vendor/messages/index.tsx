import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getVendorConversations } from "@/services/messageService";
import { EmptyState } from "@/components/shared/EmptyState";
import { CURRENT_VENDOR_STORE_ID } from "@/data/stores";
import { timeAgo } from "@/utils/format";

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
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["vendor-conversations"],
    queryFn: () => getVendorConversations(CURRENT_VENDOR_STORE_ID),
    refetchInterval: 3_000,
    refetchOnWindowFocus: "always",
  });

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>;
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
          <Link key={conv.id} to="/vendor/messages/$conversationId" params={{ conversationId: conv.id }} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30">
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
        ))}
      </div>
    </div>
  );
}
