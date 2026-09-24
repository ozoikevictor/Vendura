import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Check,
  History,
  ImagePlus,
  MessageSquare,
  Mic,
  Plus,
  Send,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Square,
  Tag,
  X,
} from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DataLoader } from "@/components/shared/DataLoader";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { formatNaira } from "@/utils/format";
import {
  createBuyerRequest,
  getAIHistory,
  getAISellerOffers,
  getBuyerRequests,
  searchWithAI,
  transcribeVoice,
  type AIProduct,
  type AIHistoryItem,
  type AISellerOffer,
  type BuyerRequest,
} from "@/services/aiService";
import { getErrorMessage } from "@/services/api";

const prompts = [
  "Hi, what can you help me with?",
  "How many products are on Vendura?",
  "How many products does Victor Fashion have?",
  "I need an iPhone 15 Pro under ₦900,000",
  "Compare prices for phones",
];

type ConversationTurn = { message: string; reply: string };
type CustomerAISession = {
  message: string;
  reply: string;
  matches: AIProduct[];
  intent: "chat" | "shopping";
  previousTurns: ConversationTurn[];
  sessionId: string;
  saved: string[];
};

const CUSTOMER_AI_SESSION_KEY = "vendura-customer-ai-chat";

function getSavedCustomerChat(): CustomerAISession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem(CUSTOMER_AI_SESSION_KEY) ?? "null") as CustomerAISession | null;
  } catch {
    return null;
  }
}

export function CustomerAIGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [authHydrated, setAuthHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve(useAuthStore.persist?.rehydrate()).finally(() => {
      if (active) setAuthHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authHydrated) return;
    if (!user || user.role !== "customer")
      navigate({ to: user ? "/vendor" : "/login", replace: true });
  }, [authHydrated, navigate, user]);
  if (!authHydrated || !user || user.role !== "customer") {
    return <div className="min-h-screen bg-background" />;
  }
  return <>{children}</>;
}

export function CustomerAIPage() {
  const user = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addByProductId);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [matches, setMatches] = useState<AIProduct[]>([]);
  const [intent, setIntent] = useState<"chat" | "shopping">("chat");
  const [previousTurns, setPreviousTurns] = useState<ConversationTurn[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [sessionRestored, setSessionRestored] = useState(false);
  const [error, setError] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [showRequest, setShowRequest] = useState(false);
  const pageShell = useRef<HTMLDivElement>(null);
  const chatScroll = useRef<HTMLDivElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    const savedChat = getSavedCustomerChat();
    if (savedChat) {
      setMessage(savedChat.message);
      setReply(savedChat.reply);
      setMatches(savedChat.matches);
      setIntent(savedChat.intent);
      setPreviousTurns(savedChat.previousTurns);
      setSessionId(savedChat.sessionId);
      setSaved(savedChat.saved);
    }
    setSessionRestored(true);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    const fitVisibleScreen = () => {
      if (pageShell.current) {
        pageShell.current.style.height = `${viewport?.height ?? window.innerHeight}px`;
        pageShell.current.style.top = `${viewport?.offsetTop ?? 0}px`;
      }
    };

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fitVisibleScreen();
    viewport?.addEventListener("resize", fitVisibleScreen);
    viewport?.addEventListener("scroll", fitVisibleScreen);
    window.addEventListener("resize", fitVisibleScreen);
    return () => {
      viewport?.removeEventListener("resize", fitVisibleScreen);
      viewport?.removeEventListener("scroll", fitVisibleScreen);
      window.removeEventListener("resize", fitVisibleScreen);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const container = chatScroll.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [loading, message, reply, previousTurns]);

  useEffect(() => {
    if (!sessionRestored) return;
    sessionStorage.setItem(CUSTOMER_AI_SESSION_KEY, JSON.stringify({
      message,
      reply,
      matches,
      intent,
      previousTurns,
      sessionId,
      saved,
    } satisfies CustomerAISession));
  }, [intent, matches, message, previousTurns, reply, saved, sessionId, sessionRestored]);

  const submit = async (value = input) => {
    if (loading || (!value.trim() && !image)) return;
    if (message && reply) setPreviousTurns((current) => [...current, { message, reply }]);
    setInput("");
    setMessage(value.trim() || `Find products similar to ${image?.name ?? "this image"}`);
    setLoading(true);
    setError("");
    try {
      const result = await searchWithAI({
        message: value.trim(),
        sessionId,
        ...(image ? { imageName: image.name, imageType: image.type } : {}),
      });
      setReply(result.response);
      setMatches(result.products);
      setIntent(result.intent);
    } catch (searchError) {
      setError(getErrorMessage(searchError, "The assistant could not search right now."));
      setMatches([]);
    } finally {
      setLoading(false);
      setImage(null);
    }
  };

  const toggleVoice = async () => {
    if (listening) {
      recorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Audio recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const mediaRecorder = new MediaRecorder(
        stream,
        preferredType ? { mimeType: preferredType } : undefined,
      );
      recorder.current = mediaRecorder;
      audioChunks.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        setVoiceStatus("Transcribing your voice...");
        try {
          const blob = new Blob(audioChunks.current, {
            type: mediaRecorder.mimeType || "audio/webm",
          });
          const audio = await blobToDataUrl(blob);
          const result = await transcribeVoice({ audio, mediaType: blob.type });
          setInput(result.text);
          setError("");
        } catch (transcriptionError) {
          setError(getErrorMessage(transcriptionError, "Your recording could not be transcribed."));
        } finally {
          setVoiceStatus("");
          recorder.current = null;
        }
      };
      mediaRecorder.start();
      setError("");
      setListening(true);
      setVoiceStatus("Recording... tap stop when you finish");
    } catch {
      setError("Microphone access is blocked. Allow microphone permission, then try again.");
    }
  };

  return (
    <CustomerAIGuard>
      <div className="fixed inset-0 overflow-hidden bg-background">
      <MarketplaceHeader contained />
      <div ref={pageShell} className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden bg-background">
        <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-0 overflow-hidden">
          <aside className="hidden w-60 shrink-0 border-r border-border bg-card p-3 sm:block sm:rounded-l-lg sm:border sm:border-r-0">
            <button
              onClick={() => {
                sessionStorage.removeItem(CUSTOMER_AI_SESSION_KEY);
                setMessage("");
                setInput("");
                setReply("");
                setMatches([]);
                setIntent("chat");
                setPreviousTurns([]);
                setSessionId(crypto.randomUUID());
                setError("");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> New chat
            </button>
            <p className="mb-2 mt-6 px-2 text-xs font-semibold uppercase text-muted-foreground">
              Your activity
            </p>
            <AINav
              to="/customer/ai/history"
              icon={<History className="h-4 w-4" />}
              label="Chat history"
            />
            <AINav
              to="/customer/ai/requests"
              icon={<Tag className="h-4 w-4" />}
              label="Buyer requests"
            />
            <AINav
              to="/customer/ai/offers"
              icon={<Store className="h-4 w-4" />}
              label="Seller offers"
            />
          </aside>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card sm:border-x">
            <header className="hidden h-16 shrink-0 items-center gap-3 border-b border-border px-5 sm:flex">
              <Link to="/marketplace" aria-label="Back to marketplace" className="rounded-md p-1 hover:bg-accent">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold sm:text-base">AI Shopping Assistant</h1>
                <p className="text-xs text-success">Online</p>
              </div>
              <Link
                to="/customer/ai/history"
                aria-label="Chat history"
                className="ml-auto rounded-md p-2 hover:bg-accent"
              >
                <History className="h-5 w-5" />
              </Link>
            </header>
            <div ref={chatScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
              <header className="-mx-3 -mt-3 mb-4 flex h-14 items-center gap-3 border-b border-border px-3 sm:hidden">
                <Link to="/marketplace" aria-label="Back to marketplace" className="rounded-md p-1 hover:bg-accent">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold">AI Shopping Assistant</h1>
                  <p className="text-xs text-success">Online</p>
                </div>
                <Link to="/customer/ai/history" aria-label="Chat history" className="ml-auto rounded-md p-2 hover:bg-accent">
                  <History className="h-5 w-5" />
                </Link>
              </header>
              {!message ? (
                <div className="mx-auto w-full max-w-3xl py-3 sm:py-8">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        Hello {user?.fullName.split(" ")[0] ?? "there"}, how can I help you shop today?
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tell me the product, budget, colour, size, or delivery date you need.
                      </p>
                    </div>
                  </div>
                  <div className="my-4 h-px bg-border" />
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Popular searches</p>
                  <div className="flex w-full flex-wrap gap-2">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => submit(prompt)}
                        className="rounded-full border border-border bg-background px-3 py-2 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-primary-soft sm:text-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-3 sm:space-y-5">
                  {previousTurns.map((turn, index) => (
                    <div key={`${turn.message}-${index}`} className="space-y-3 border-b border-border pb-4">
                      <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground sm:px-4 sm:py-3">
                        {turn.message}
                      </div>
                      <div className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <p className="pt-1 text-sm">{turn.reply}</p>
                      </div>
                    </div>
                  ))}
                  <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground sm:px-4 sm:py-3">
                    {message}
                  </div>
                  {loading ? (
                    <Typing />
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <p className="pt-1 text-sm">{reply}</p>
                      </div>
                      <div className="flex snap-x gap-3 overflow-x-auto pb-3">
                        {matches.map((product) => {
                          const store = product.store;
                          return (
                            <article
                              key={product.id}
                              className="w-64 shrink-0 snap-start overflow-hidden rounded-lg border border-border bg-background"
                            >
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-36 w-full object-cover"
                              />
                              <div className="p-3">
                                <h3 className="line-clamp-2 text-sm font-semibold">
                                  {product.name}
                                </h3>
                                <p className="mt-1 text-lg font-bold">
                                  {formatNaira(product.price)}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {store?.name ?? "Verified seller"}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-xs">
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-warning text-warning" />{" "}
                                    {product.rating || store?.rating || "New"}
                                  </span>
                                  <span className="rounded bg-success-soft px-1.5 py-0.5 text-success">
                                    {store?.verified ? "Verified" : "Seller"}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Condition: New · Delivery 1-2 days
                                </p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <a
                                    href={`/product/${product.slug}?from=customer-ai`}
                                    className="rounded-md border border-border px-2 py-2 text-center text-xs font-semibold"
                                  >
                                    View
                                  </a>
                                  <button
                                    onClick={() => addItem(product, 1)}
                                    className="flex items-center justify-center gap-1 rounded-md bg-primary px-2 py-2 text-xs font-semibold text-primary-foreground"
                                  >
                                    <ShoppingCart className="h-3 w-3" /> Add
                                  </button>
                                  <Link
                                    to="/messages"
                                    className="rounded-md border border-border px-2 py-2 text-center text-xs font-semibold"
                                  >
                                    Message
                                  </Link>
                                  <button
                                    onClick={() =>
                                      setSaved((current) =>
                                        current.includes(product.id)
                                          ? current.filter((id) => id !== product.id)
                                          : [...current, product.id],
                                      )
                                    }
                                    className="rounded-md border border-border px-2 py-2 text-xs font-semibold"
                                  >
                                    {saved.includes(product.id) ? "Saved" : "Save"}
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      {intent === "shopping" && matches.length === 0 && !error && (
                        <div className="rounded-lg border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground sm:p-6">
                          No matching live products were found.
                        </div>
                      )}
                      {intent === "shopping" && <div className="rounded-lg border border-dashed border-primary/40 bg-primary-soft p-3 sm:p-4">
                        <p className="font-semibold">Couldn&apos;t find the perfect match?</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Let verified sellers send you offers that match your exact needs.
                        </p>
                        <button
                          onClick={() => setShowRequest(true)}
                          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:mt-3"
                        >
                          Create Buyer Request
                        </button>
                      </div>}
                    </>
                  )}
                </div>
              )}
            </div>
            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                submit();
              }}
              className="shrink-0 border-t border-border bg-card p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4"
            >
              <div className="mx-auto flex max-w-3xl items-end gap-1 rounded-lg border border-input bg-background p-1.5 sm:gap-2 sm:p-2">
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  aria-label="Attach image"
                  title="Add a product image"
                  onClick={() => imageInput.current?.click()}
                  className={`p-2 ${image ? "text-primary" : "text-muted-foreground"}`}
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
                <textarea
                  ref={composerInput}
                  value={input}
                  onPointerDown={(event) => {
                    if (document.activeElement !== composerInput.current) {
                      event.preventDefault();
                      composerInput.current?.focus({ preventScroll: true });
                    }
                  }}
                  onChange={(event) => {
                    setInput(event.target.value);
                    if (error) setError("");
                  }}
                  rows={1}
                  placeholder="Tell the AI what you want..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  aria-label={listening ? "Stop recording" : "Record voice request"}
                  title={listening ? "Stop recording" : "Record voice request"}
                  onClick={toggleVoice}
                  className={`p-2 ${listening ? "animate-pulse text-destructive" : "text-muted-foreground"}`}
                >
                  {listening ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={loading || (!input.trim() && !image)}
                  className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {image && (
                <p className="mx-auto mt-2 max-w-3xl truncate text-xs text-primary">
                  Image attached: {image.name}
                </p>
              )}
              {voiceStatus && (
                <p
                  role="status"
                  className="mx-auto mt-2 max-w-3xl text-xs font-semibold text-primary"
                >
                  {voiceStatus}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mx-auto mt-2 max-w-3xl text-xs font-medium text-destructive"
                >
                  {error}
                </p>
              )}
            </form>
          </section>
        </main>
        {showRequest && (
          <BuyerRequestModal initialProduct={message} onClose={() => setShowRequest(false)} />
        )}
      </div>
      </div>
    </CustomerAIGuard>
  );
}

function AINav({
  to,
  icon,
  label,
}: {
  to: "/customer/ai/history" | "/customer/ai/requests" | "/customer/ai/offers";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}
function Typing() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className="flex gap-1" aria-label="AI is thinking">
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>{" "}
      Searching the marketplace...
    </div>
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the audio recording"));
    reader.readAsDataURL(blob);
  });
}

function BuyerRequestModal({
  initialProduct,
  onClose,
}: {
  initialProduct: string;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    product: initialProduct || "",
    details: "",
    condition: "New or excellent condition",
    maximumBudget: 100000,
    deliveryLocation: "My saved delivery location",
    neededBy: "Within 7 days",
  });
  const update = (field: keyof typeof form, value: string | number) =>
    setForm((current) => ({ ...current, [field]: value }));
  const sendRequest = async () => {
    setSending(true);
    setFormError("");
    try {
      await createBuyerRequest(form);
      setSent(true);
    } catch (requestError) {
      setFormError(getErrorMessage(requestError, "The buyer request could not be sent."));
    } finally {
      setSending(false);
    }
  };
  return (
    <div
      className="absolute inset-0 z-[100] flex items-start justify-center bg-foreground/40 p-2 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-request-title"
        className="max-h-[calc(100%-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-4 shadow-xl sm:max-h-[85dvh] sm:p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="buyer-request-title" className="text-lg font-bold">
            Buyer request
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sent ? (
          <div className="py-10 text-center">
            <Check className="mx-auto h-10 w-10 text-success" />
            <h3 className="mt-3 font-semibold">Request sent to matching sellers</h3>
            <Link
              to="/customer/ai/requests"
              className="mt-4 inline-block text-sm font-semibold text-primary"
            >
              View buyer requests
            </Link>
          </div>
        ) : reviewing ? (
          <>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <Info label="Product" value={form.product} />
              <Info label="Condition" value={form.condition} />
              <Info label="Maximum budget" value={formatNaira(form.maximumBudget)} />
              <Info label="Needed by" value={form.neededBy} />
              <Info label="Delivery location" value={form.deliveryLocation} />
              {form.details && <Info label="Other details" value={form.details} />}
            </dl>
            <p className="mt-5 rounded-md bg-warning-soft p-3 text-xs">
              Nothing is sent until you confirm this request.
            </p>
            {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setReviewing(false)}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-semibold"
              >
                Edit Request
              </button>
              <button
                onClick={sendRequest}
                disabled={sending}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send to Sellers"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <RequestField
                label="Product"
                value={form.product}
                onChange={(value) => update("product", value)}
              />
              <RequestField
                label="Condition"
                value={form.condition}
                onChange={(value) => update("condition", value)}
              />
              <RequestField
                label="Maximum budget"
                type="number"
                value={String(form.maximumBudget)}
                onChange={(value) => update("maximumBudget", Number(value))}
              />
              <RequestField
                label="Needed by"
                value={form.neededBy}
                onChange={(value) => update("neededBy", value)}
              />
              <div className="sm:col-span-2">
                <RequestField
                  label="Delivery location"
                  value={form.deliveryLocation}
                  onChange={(value) => update("deliveryLocation", value)}
                />
              </div>
              <label className="text-sm font-semibold sm:col-span-2">
                Other details
                <textarea
                  value={form.details}
                  onPointerDown={(event) => {
                    if (document.activeElement !== event.currentTarget) {
                      event.preventDefault();
                      event.currentTarget.focus({ preventScroll: true });
                    }
                  }}
                  onChange={(event) => update("details", event.target.value)}
                  placeholder="Size, colour, storage, specifications..."
                  className="mt-1 min-h-20 w-full rounded-md border border-input bg-background p-3 font-normal"
                />
              </label>
            </div>
            <button
              disabled={
                !form.product.trim() ||
                !form.condition.trim() ||
                !form.deliveryLocation.trim() ||
                !form.neededBy.trim() ||
                form.maximumBudget <= 0
              }
              onClick={() => setReviewing(true)}
              className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Review Request
            </button>
          </>
        )}
      </div>
    </div>
  );
}
function RequestField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        type={type}
        value={value}
        onPointerDown={(event) => {
          if (document.activeElement !== event.currentTarget) {
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
          }
        }}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-normal"
      />
    </label>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

export function CustomerAIListPage({ kind }: { kind: "history" | "requests" | "offers" }) {
  const [buyerRequests, setBuyerRequests] = useState<BuyerRequest[]>([]);
  const [history, setHistory] = useState<AIHistoryItem[]>([]);
  const [offers, setOffers] = useState<AISellerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const load =
      kind === "requests"
        ? getBuyerRequests()
        : kind === "history"
          ? getAIHistory()
          : getAISellerOffers();
    load
      .then((items) => {
        if (kind === "requests") setBuyerRequests(items as BuyerRequest[]);
        if (kind === "history") setHistory(items as AIHistoryItem[]);
        if (kind === "offers") setOffers(items as AISellerOffer[]);
      })
      .catch((error) =>
        setLoadError(getErrorMessage(error, "This information could not be loaded.")),
      )
      .finally(() => setLoading(false));
  }, [kind]);
  const title =
    kind === "history" ? "AI history" : kind === "requests" ? "Buyer requests" : "Seller offers";
  return (
    <CustomerAIGuard>
      <div className="flex min-h-screen flex-col bg-background">
        <MarketplaceHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
          <Link
            to="/customer/ai"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> AI Assistant
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your shopping conversations, requests, and seller responses.
          </p>
          <div className="mt-6 space-y-3">
            {loading ? (
              <DataLoader label={`Loading ${title.toLowerCase()}`} className="min-h-72" />
            ) : loadError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive-soft p-4 text-sm text-destructive">
                {loadError}
              </div>
            ) : kind === "requests" ? (
              buyerRequests.length > 0 ? (
                buyerRequests.map((request) => (
                  <article key={request.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-semibold">{request.product}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.condition} · Up to {formatNaira(request.maximumBudget)}
                        </p>
                      </div>
                      <span className="rounded bg-success-soft px-2 py-1 text-xs font-semibold capitalize text-success">
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span>{request.deliveryLocation}</span>
                      <span>Needed: {request.neededBy}</span>
                      <span>{request.offerCount} offers</span>
                    </div>
                    {request.details && (
                      <p className="mt-3 border-t border-border pt-3 text-sm">{request.details}</p>
                    )}
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No buyer requests yet.
                </div>
              )
            ) : kind === "history" ? (
              history.length > 0 ? (
                history.map((item) => (
                  <article
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <MessageSquare className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold">{item.query}</h2>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{item.response}</p>
                    </div>
                    <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-medium">
                      {item.resultCount} results
                    </span>
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No AI conversations yet.
                </div>
              )
            ) : offers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {offers.map((offer) => (
                  <article key={offer.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex items-start gap-3">
                      {offer.productImage && (
                        <img
                          src={offer.productImage}
                          alt=""
                          className="h-14 w-14 rounded-md object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase text-primary">
                          {offer.store?.verified ? "Verified seller" : "Seller offer"}
                        </p>
                        <h2 className="truncate font-bold">
                          {offer.store?.name ?? "Marketplace seller"}
                        </h2>
                        <p className="truncate text-sm text-muted-foreground">
                          {offer.productName}
                        </p>
                      </div>
                      {offer.store && (
                        <span className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          {offer.store.rating}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-2xl font-bold">
                      {formatNaira(offer.counterPrice ?? offer.offeredPrice)}
                    </p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      Status: {offer.status}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      {offer.productSlug ? (
                        <Link
                          to="/product/$slug"
                          params={{ slug: offer.productSlug }}
                          className="rounded-md border border-border px-3 py-2 text-center text-sm font-semibold"
                        >
                          View product
                        </Link>
                      ) : (
                        <span className="rounded-md border border-border px-3 py-2 text-center text-sm text-muted-foreground">
                          Product unavailable
                        </span>
                      )}
                      <Link
                        to="/messages/$conversationId"
                        params={{ conversationId: offer.conversationId }}
                        className="rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
                      >
                        Message seller
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No seller offers yet.
              </div>
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    </CustomerAIGuard>
  );
}

export function DealRoomPage() {
  const [offer, setOffer] = useState(850000);
  const [agreed, setAgreed] = useState(false);
  return (
    <CustomerAIGuard>
      <div className="flex min-h-screen flex-col bg-background">
        <MarketplaceHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <Link
            to="/customer/ai/offers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Offers
          </Link>
          <div className="mt-5 rounded-lg border border-border bg-card">
            <header className="border-b border-border p-5">
              <p className="text-xs font-semibold uppercase text-primary">Deal room</p>
              <h1 className="text-xl font-bold">You ↔ TechHub Nigeria</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                iPhone 15 Pro 256GB · Verified seller
              </p>
            </header>
            <div className="space-y-4 p-5">
              <div className="max-w-[80%] rounded-lg bg-muted p-3 text-sm">
                I can deliver tomorrow. The phone has 91% battery health.
              </div>
              <div className="ml-auto max-w-[80%] rounded-lg bg-primary p-3 text-sm text-primary-foreground">
                My offer is {formatNaira(offer)}.
              </div>
              <div className="max-w-[80%] rounded-lg bg-muted p-3 text-sm">
                I can accept ₦865,000 including delivery.
              </div>
              {agreed && (
                <div className="rounded-lg border border-success/30 bg-success-soft p-4">
                  <p className="text-xs font-semibold uppercase text-success">Agreed deal</p>
                  <h2 className="mt-1 font-bold">iPhone 15 Pro 256GB · ₦865,000</h2>
                  <p className="mt-1 text-sm">
                    Delivery included · Used · Battery health minimum 90%
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                      Accept Deal
                    </button>
                    <button
                      onClick={() => setAgreed(false)}
                      className="rounded-md border border-border px-4 py-2 text-sm font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 border-t border-border p-4">
              <input
                value={offer}
                onChange={(e) => setOffer(Number(e.target.value))}
                type="number"
                aria-label="Your offer"
                className="min-w-0 flex-1 rounded-md border border-input px-3"
              />
              <button
                onClick={() => setAgreed(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Make Offer
              </button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    </CustomerAIGuard>
  );
}
