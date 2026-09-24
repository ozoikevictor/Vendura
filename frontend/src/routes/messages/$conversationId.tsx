import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Tag, Check, X, RotateCw, ShoppingBasket } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConversation, getMessages, getOffersForConversation,
  sendMessage, makeOffer, respondToOffer, markConversationRead,
} from "@/services/messageService";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { products } from "@/data/products";
import { formatNaira, timeAgo } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Offer } from "@/types";

export const Route = createFileRoute("/messages/$conversationId")({
  head: () => ({
    meta: [
      { title: "Conversation — Vendura" },
      { name: "description", content: "Chat with a seller on Vendura." },
      { property: "og:title", content: "Conversation — Vendura" },
      { property: "og:description", content: "Chat with a seller on Vendura." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addToCart = useCartStore((s) => s.add);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [showOffer, setShowOffer] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId),
    refetchInterval: 3_000,
    refetchOnWindowFocus: "always",
  });

  const { data: offers } = useQuery({
    queryKey: ["offers", conversationId],
    queryFn: () => getOffersForConversation(conversationId),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conv) return;
    markConversationRead(conversationId, "customer").then(() => {
      queryClient.invalidateQueries({ queryKey: ["customer-conversations"] });
    }).catch(() => undefined);
  }, [conv, conversationId, messages?.length, queryClient]);

  const activeOffer = offers?.find((o) => o.status === "pending" || o.status === "countered");
  const acceptedOffer = offers?.find((o) => o.status === "accepted");
  const product = conv ? products.find((p) => p.id === conv.productId) : null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !conv) return;
    const msgText = text;
    setText("");
    try {
      await sendMessage(conv.id, user?.id ?? "user-cust-1", "customer", msgText);
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["customer-conversations"] });
    } catch {
      toast.error("Failed to send message");
    }
  }

  async function handleMakeOffer() {
    if (!conv || !offerAmount) return;
    setActionLoading(true);
    try {
      await makeOffer(conv.id, conv.productId, conv.productPrice, Number(offerAmount), "customer");
      queryClient.invalidateQueries({ queryKey: ["offers", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success("Offer sent");
      setShowOffer(false);
      setOfferAmount("");
    } catch {
      toast.error("Failed to send offer");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRespondOffer(offer: Offer, response: "accepted" | "rejected" | "countered", counter?: string) {
    setActionLoading(true);
    try {
      await respondToOffer(offer.id, response, counter ? Number(counter) : undefined);
      queryClient.invalidateQueries({ queryKey: ["offers", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      toast.success(response === "accepted" ? "Offer accepted" : "Offer rejected");
      setCounterAmount("");
    } catch {
      toast.error("Failed to respond");
    } finally {
      setActionLoading(false);
    }
  }

  function handleAddAgreedToCart() {
    if (!product || !acceptedOffer || !conv) return;
    addToCart(product, null, 1, { offerId: acceptedOffer.id, agreedPrice: conv.agreedPrice ?? acceptedOffer.offeredPrice });
    toast.success("Added to cart at agreed price");
    navigate({ to: "/cart" });
  }

  if (!conv) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <h1 className="text-xl font-semibold text-foreground">Conversation not found</h1>
          <Link to="/messages" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Back to messages</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Link to="/messages" className="text-muted-foreground hover:text-primary"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{conv.storeName}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{conv.productName}</p>
          </div>
        </div>

        {/* Product preview */}
        <Link to="/product/$slug" params={{ slug: product?.slug ?? "" }} className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/30">
          <img src={conv.productImage} alt="" className="h-10 w-10 rounded border border-border object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground line-clamp-1">{conv.productName}</p>
            <p className="text-xs text-muted-foreground">{formatNaira(conv.productPrice)}</p>
          </div>
          {conv.agreedPrice && (
            <span className="flex items-center gap-1 rounded-md bg-success-soft px-2 py-1 text-xs font-semibold text-success">
              <Tag className="h-3 w-3" /> {formatNaira(conv.agreedPrice)}
            </span>
          )}
        </Link>

        {/* Agreed price CTA */}
        {acceptedOffer && conv.agreedPrice && (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-success-soft px-3 py-2">
            <span className="text-sm font-semibold text-success">Agreed price: {formatNaira(conv.agreedPrice)}</span>
            <button onClick={handleAddAgreedToCart} className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90">
              <ShoppingBasket className="h-3.5 w-3.5" /> Add to cart
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto py-4 scrollbar-none">
          {messages?.map((msg) => {
            const isCustomer = msg.senderRole === "customer";
            const isSystem = msg.senderRole === "system";
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs text-muted-foreground">{msg.text}</span>
                </div>
              );
            }
            const offer = msg.offerId ? offers?.find((o) => o.id === msg.offerId) : null;
            return (
              <div key={msg.id} className={cn("flex", isCustomer ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  isCustomer ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground",
                )}>
                  {offer ? (
                    <div>
                      <p className="text-xs opacity-80">Offer: {formatNaira(offer.offeredPrice)}</p>
                      {offer.counterPrice && <p className="text-xs opacity-80">Counter: {formatNaira(offer.counterPrice)}</p>}
                      <p className="mt-0.5 text-xs font-semibold">
                        {offer.status === "accepted" ? "✓ Accepted" : offer.status === "rejected" ? "✗ Rejected" : offer.status === "countered" ? "↻ Countered" : "Pending"}
                      </p>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                  <p className={cn("mt-0.5 text-xs", isCustomer ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {timeAgo(msg.sentAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Offer action bar */}
        {activeOffer && activeOffer.by === "vendor" && (
          <div className="border-t border-border pt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Seller's counter: <span className="font-semibold text-foreground">{formatNaira(activeOffer.counterPrice ?? activeOffer.offeredPrice)}</span></p>
              <div className="flex-1" />
              <button onClick={() => handleRespondOffer(activeOffer, "accepted")} disabled={actionLoading} className="flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:opacity-60">
                <Check className="h-3.5 w-3.5" /> Accept
              </button>
              <button onClick={() => handleRespondOffer(activeOffer, "rejected")} disabled={actionLoading} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-60">
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <input type="number" value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} placeholder="Counter offer ₦" className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <button onClick={() => counterAmount && handleRespondOffer(activeOffer, "countered", counterAmount)} disabled={actionLoading || !counterAmount} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-60">
                <RotateCw className="h-3.5 w-3.5" /> Counter
              </button>
            </div>
          </div>
        )}

        {/* Make offer / message input */}
        <div className="border-t border-border pt-2">
          {showOffer && (
            <div className="mb-2 flex items-center gap-2">
              <input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder={`Offer amount (list: ${formatNaira(conv.productPrice)})`} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              <button onClick={handleMakeOffer} disabled={actionLoading || !offerAmount} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">Send offer</button>
              <button onClick={() => setShowOffer(false)} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent">Cancel</button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            {!showOffer && product?.negotiable && (
              <button type="button" onClick={() => setShowOffer(true)} className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
                <Tag className="h-4 w-4" /> Make Offer
              </button>
            )}
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            <button type="submit" disabled={!text.trim()} className="flex items-center justify-center rounded-lg bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
