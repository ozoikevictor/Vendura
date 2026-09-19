import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/shared/EmptyState";
import { useQuery } from "@tanstack/react-query";
import { getCustomerConversations } from "@/services/messageService";
import { useAuthStore } from "@/store/auth";
import { timeAgo } from "@/utils/format";
import { cn } from "@/lib/utils";

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
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["customer-conversations"],
    queryFn: () => getCustomerConversations(user?.id ?? "user-cust-1"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
        </div>
        <SiteFooter />
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
        <SiteFooter />
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
            <Link
              key={conv.id}
              to="/messages/$conversationId"
              params={{ conversationId: conv.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30"
            >
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
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
