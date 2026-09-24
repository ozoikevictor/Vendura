import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Tag, Check, X, RotateCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConversation, getMessages, getOffersForConversation,
  sendMessage, respondToOffer, markConversationRead,
} from "@/services/messageService";
import { timeAgo, formatNaira } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Offer } from "@/types";

export const Route = createFileRoute("/vendor/messages/$conversationId")({
  head: () => ({
    meta: [
      { title: "Conversation — Vendor — Vendura" },
      { name: "description", content: "Chat with customer." },
      { property: "og:title", content: "Conversation — Vendura" },
      { property: "og:description", content: "Chat with customer." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorConversationPage,
});

function VendorConversationPage() {
  const { conversationId } = Route.useParams();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerInput = useRef<HTMLInputElement>(null);

  const { data: conv } = useQuery({ queryKey: ["vendor-conversation", conversationId], queryFn: () => getConversation(conversationId) });
  const { data: messages } = useQuery({ queryKey: ["vendor-messages", conversationId], queryFn: () => getMessages(conversationId), refetchInterval: 3_000, refetchOnWindowFocus: "always" });
  const { data: offers } = useQuery({ queryKey: ["vendor-offers", conversationId], queryFn: () => getOffersForConversation(conversationId) });

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  useEffect(() => {
    if (!conv) return;
    markConversationRead(conversationId, "vendor").then(() => {
      queryClient.invalidateQueries({ queryKey: ["vendor-conversations"] });
    }).catch(() => undefined);
  }, [conv, conversationId, messages?.length, queryClient]);

  const activeOffer = offers?.find((o) => o.status === "pending" && o.by === "customer");

  function keepComposerVisible() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    composerInput.current?.scrollIntoView({ block: "nearest" });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !conv) return;
    const msg = text;
    setText("");
    composerInput.current?.blur();
    try {
      await sendMessage(conv.id, "user-vendor-1", "vendor", msg);
      queryClient.invalidateQueries({ queryKey: ["vendor-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-conversations"] });
    } catch { toast.error("Failed to send"); }
  }

  async function handleRespond(offer: Offer, response: "accepted" | "rejected" | "countered", counter?: string) {
    setLoading(true);
    try {
      await respondToOffer(offer.id, response, counter ? Number(counter) : undefined);
      queryClient.invalidateQueries({ queryKey: ["vendor-offers", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-messages", conversationId] });
      toast.success(response === "accepted" ? "Offer accepted" : response === "rejected" ? "Offer rejected" : "Counter sent");
      setCounterAmount("");
    } catch { toast.error("Failed"); } finally { setLoading(false); }
  }

  if (!conv) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-semibold text-foreground">Conversation not found</h1>
        <Link to="/vendor/messages" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Back</Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-border px-3 py-2 sm:px-0 sm:pb-3 sm:pt-0">
        <Link to="/vendor/messages" className="text-muted-foreground hover:text-primary"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{conv.customerName}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{conv.productName}</p>
        </div>
        {conv.agreedPrice && (
          <span className="flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">
            <Tag className="h-3 w-3" /> {formatNaira(conv.agreedPrice)}
          </span>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scrollbar-none sm:px-0 sm:py-4">
        {messages?.map((msg) => {
          const isVendor = msg.senderRole === "vendor";
          const isSystem = msg.senderRole === "system";
          if (isSystem) return (
            <div key={msg.id} className="flex justify-center">
              <span className="rounded-full bg-accent px-3 py-1 text-xs text-muted-foreground">{msg.text}</span>
            </div>
          );
          const offer = msg.offerId ? offers?.find((o) => o.id === msg.offerId) : null;
          return (
            <div key={msg.id} className={cn("flex", isVendor ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", isVendor ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground")}>
                {offer ? (
                  <div>
                    <p className="text-xs opacity-80">Offer: {formatNaira(offer.offeredPrice)}</p>
                    {offer.counterPrice && <p className="text-xs opacity-80">Counter: {formatNaira(offer.counterPrice)}</p>}
                    <p className="mt-0.5 text-xs font-semibold">{offer.status === "accepted" ? "✓ Accepted" : offer.status === "rejected" ? "✗ Rejected" : offer.status === "countered" ? "↻ Countered" : "Pending"}</p>
                  </div>
                ) : <p>{msg.text}</p>}
                <p className={cn("mt-0.5 text-xs", isVendor ? "text-primary-foreground/60" : "text-muted-foreground")}>{timeAgo(msg.sentAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {activeOffer && (
        <div className="mx-3 shrink-0 border-t border-border pt-2 sm:mx-0">
          <p className="text-sm text-muted-foreground">Customer offered: <span className="font-semibold text-foreground">{formatNaira(activeOffer.offeredPrice)}</span> (list: {formatNaira(activeOffer.originalPrice)})</p>
          <div className="mt-1 flex items-center gap-2">
            <button onClick={() => handleRespond(activeOffer, "accepted")} disabled={loading} className="flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:opacity-60">
              <Check className="h-3.5 w-3.5" /> Accept
            </button>
            <button onClick={() => handleRespond(activeOffer, "rejected")} disabled={loading} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-60">
              <X className="h-3.5 w-3.5" /> Reject
            </button>
            <input type="number" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="Counter ₦" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm" />
            <button onClick={() => counterAmount && handleRespond(activeOffer, "countered", counterAmount)} disabled={loading || !counterAmount} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-60">
              <RotateCw className="h-3.5 w-3.5" /> Counter
            </button>
          </div>
        </div>
      )}

      <form data-vendor-composer onSubmit={handleSend} className="relative z-10 flex shrink-0 items-center gap-2 border-t border-border bg-card px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 sm:bg-transparent sm:px-0 sm:pb-[env(safe-area-inset-bottom)]">
        <input
          ref={composerInput}
          value={text}
          onFocus={() => {
            requestAnimationFrame(keepComposerVisible);
            window.setTimeout(keepComposerVisible, 150);
            window.setTimeout(keepComposerVisible, 350);
          }}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm"
        />
        <button type="submit" disabled={!text.trim()} className="flex items-center justify-center rounded-lg bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
