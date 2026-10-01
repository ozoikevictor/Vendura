import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bot,
  Boxes,
  CheckCircle2,
  Clock3,
  PackagePlus,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/services/api";
import { getSubscription, searchVendorAI, type VendorAIResult } from "@/services/vendorService";
import { useQuery } from "@tanstack/react-query";
import { DataLoader } from "@/components/shared/DataLoader";

const vendorPrompts = [
  "How are you doing?",
  "What is my revenue today?",
  "What are my sales today?",
  "How many orders do I have today?",
  "What needs to be restocked?",
  "Which product has the highest price?",
  "Which products have the most stock?",
  "Show my best-selling products",
];

type VendorTurn = VendorAIResult & { message: string };
const VENDOR_AI_SESSION_KEY = "vendura-vendor-ai-chat";

export function VendorAIAccess({ children }: { children: React.ReactNode }) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: getSubscription,
  });
  if (isLoading || !subscription)
    return <DataLoader label="Checking AI access" className="min-h-72" />;
  if (!subscription.sellerAIEnabled) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-4">
        <div className="w-full rounded-lg border border-border bg-card p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-xl font-bold">Unlock seller AI</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The AI business assistant and buyer opportunity matching are included with the Growing
            Business and Enterprise plans.
          </p>
          <Link
            to="/vendor/subscription"
            className="mt-5 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }
  return children;
}

function getSavedVendorTurns() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(VENDOR_AI_SESSION_KEY) ?? "[]") as VendorTurn[];
  } catch {
    return [];
  }
}

export function VendorAIPage() {
  const user = useAuthStore((s) => s.user)!;
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<VendorTurn[]>([]);
  const [sessionRestored, setSessionRestored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatScroll = useRef<HTMLDivElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTurns(getSavedVendorTurns());
    setSessionRestored(true);
  }, []);

  useEffect(() => {
    if (turns.length === 0 && !loading) return;
    chatScroll.current?.scrollTo({ top: chatScroll.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  useEffect(() => {
    if (!sessionRestored) return;
    sessionStorage.setItem(VENDOR_AI_SESSION_KEY, JSON.stringify(turns));
  }, [sessionRestored, turns]);

  const send = async (value = input) => {
    const message = value.trim();
    if (!message || loading) return;
    setInput("");
    setError("");
    setLoading(true);
    try {
      const result = await searchVendorAI(message);
      setTurns((current) => [...current, { message, ...result }]);
    } catch (sendError) {
      setError(getErrorMessage(sendError, "The business assistant could not respond right now."));
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setTurns([]);
    sessionStorage.removeItem(VENDOR_AI_SESSION_KEY);
    setInput("");
    setError("");
  };

  return (
    <div className="mx-auto grid h-full w-full max-w-7xl overflow-hidden rounded-none border-border bg-background sm:rounded-xl sm:border xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card p-5 xl:flex xl:flex-col">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold">AI Business Assistant</h1>
            <p className="text-xs font-medium text-success">Connected to your live store</p>
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">Ask about</p>
          <div className="mt-3 grid gap-2">
            <AssistantScope icon={TrendingUp} label="Revenue and sales" />
            <AssistantScope icon={Clock3} label="Orders and customers" />
            <AssistantScope icon={Boxes} label="Stock and restocking" />
            <AssistantScope icon={PackagePlus} label="Product performance" />
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning-soft p-4">
          <p className="text-sm font-semibold text-warning-foreground">Protected actions</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The assistant can explain balances and payout steps, but it will not move money, edit
            products, cancel orders, or change bank details from chat.
          </p>
        </div>
        <button
          type="button"
          onClick={newChat}
          className="mt-auto flex h-10 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </aside>

      <section className="flex min-h-0 flex-col bg-card">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-5">
          <Link
            to="/vendor"
            aria-label="Back to dashboard"
            className="rounded-md p-1 hover:bg-accent xl:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground xl:hidden">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold sm:text-base">AI Business Assistant</h1>
            <p className="truncate text-xs text-success">Ready to answer from your vendor data</p>
          </div>
          <button
            type="button"
            onClick={newChat}
            title="Start a new chat"
            aria-label="Start a new chat"
            className="ml-auto flex h-9 shrink-0 items-center gap-2 rounded-md border border-border px-2.5 text-xs font-semibold hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        </header>

        <div
          ref={chatScroll}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background p-3 sm:p-6"
        >
          {turns.length === 0 ? (
            <div className="mx-auto flex max-w-4xl flex-col gap-5 py-2 sm:py-8">
              <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-bold">
                      Hello {user.fullName.split(" ")[0]}, how can I help your store today?
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Ask about your revenue, sales, orders, customers, stock, restocking, product
                      prices, best sellers, or buyer opportunities.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StarterCard
                  title="Store pulse"
                  prompts={vendorPrompts.slice(1, 4)}
                  onPick={send}
                />
                <StarterCard
                  title="Inventory decisions"
                  prompts={vendorPrompts.slice(4, 8)}
                  onPick={send}
                />
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {turns.map((turn, index) => (
                <div
                  key={`${turn.message}-${index}`}
                  className="space-y-3 border-b border-border pb-5 last:border-0"
                >
                  <div className="ml-auto max-w-[88%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground sm:px-4 sm:py-3">
                    {turn.message}
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <p className="pt-1 text-sm leading-6">{turn.response}</p>
                  </div>
                  {turn.metrics.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pl-11 sm:grid-cols-3">
                      {turn.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-md border border-border bg-background p-3"
                        >
                          <p className="text-xs text-muted-foreground">{metric.label}</p>
                          <p className="mt-1 font-bold">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {turn.items.length > 0 && (
                    <div className="space-y-2 pl-0 sm:pl-11">
                      {turn.items.map((item) => (
                        <a
                          key={`${item.type}-${item.id}`}
                          href={`${item.href}${item.href.includes("?") ? "&" : "?"}from=vendor-ai`}
                          className="flex items-center gap-3 rounded-md border border-border bg-background p-3 hover:border-primary hover:bg-primary-soft"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary">
                              <Boxes className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {item.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {item.meta}
                            </span>
                          </span>
                          <span className="text-xs font-semibold text-primary">Open</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {loading && (
            <div className="mx-auto flex max-w-3xl items-center gap-3 text-sm text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Sparkles className="h-4 w-4 animate-pulse" />
              </span>
              Checking your store data...
            </div>
          )}
        </div>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            send();
          }}
          className="shrink-0 border-t border-border bg-card p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4"
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-lg border border-input bg-background p-2">
            <textarea
              ref={composerInput}
              value={input}
              onPointerDown={(event) => {
                if (document.activeElement !== composerInput.current) {
                  event.preventDefault();
                  composerInput.current?.focus({ preventScroll: true });
                }
              }}
              onFocus={() => {
                requestAnimationFrame(() =>
                  chatScroll.current?.scrollTo({ top: chatScroll.current.scrollHeight }),
                );
              }}
              onChange={(event) => {
                setInput(event.target.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask about your store..."
              className="max-h-28 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-base outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {error && (
            <p role="alert" className="mx-auto mt-2 max-w-3xl text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}

function AssistantScope({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="h-4 w-4 text-success" />
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </div>
  );
}

function StarterCard({
  title,
  prompts,
  onPick,
}: {
  title: string;
  prompts: string[];
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-3 grid gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm font-medium hover:border-primary hover:bg-primary-soft"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
function VendorTool({
  to,
  icon,
  title,
  text,
}: {
  to: "/vendor/ai/opportunities" | "/vendor/ai/products" | "/vendor/ai/analytics";
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link to={to} className="rounded-lg border border-border bg-card p-4 hover:border-primary">
      <span className="text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </Link>
  );
}
export function VendorOpportunities() {
  const [result, setResult] = useState<VendorAIResult | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    searchVendorAI("Show buyer requests matching my products")
      .then(setResult)
      .catch((loadError) =>
        setError(getErrorMessage(loadError, "Buyer opportunities could not be loaded.")),
      );
  }, []);
  return (
    <VendorPage
      title="Buyer opportunities"
      intro="Customer requests that match products in your inventory."
    >
      {!result && !error && (
        <p className="text-sm text-muted-foreground">Checking live buyer requests...</p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      {result && <p className="mb-4 text-sm text-muted-foreground">{result.response}</p>}
      <div className="space-y-3">
        {result?.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase text-primary">Buyer request</p>
            <h2 className="mt-1 font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.subtitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
          </div>
        ))}
      </div>
    </VendorPage>
  );
}
export function VendorProductCreator() {
  return (
    <VendorPage
      title="AI product creator"
      intro="Create an editable listing draft. Nothing is published automatically."
    >
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="text-sm font-semibold">What product are you listing?</label>
        <p className="text-sm text-muted-foreground">
          Product drafting is not connected yet. Add or edit products from the Products section so
          no generated details are mistaken for live store data.
        </p>
        <Link
          to="/vendor/products/new"
          className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Add a product
        </Link>
      </div>
    </VendorPage>
  );
}
export function VendorAIAnalytics() {
  const metrics: Array<[string, string, LucideIcon]> = [
    ["Revenue", "₦485,000", TrendingUp],
    ["Orders", "24", Boxes],
    ["Products sold", "31", PackagePlus],
    ["Pending orders", "6", Boxes],
    ["Low stock", "4", Boxes],
  ];
  return (
    <VendorPage
      title="AI analytics"
      intro="Factual store insights will appear only when returned by the backend."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <Icon className="h-4 w-4 text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-lg border border-border bg-card p-5">
        <h2 className="font-semibold">Store summary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Demo values are clearly separated from live analytics. Connect the existing vendor
          analytics endpoint before showing generated conclusions.
        </p>
      </div>
    </VendorPage>
  );
}
function VendorPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/vendor/ai" className="text-sm font-semibold text-primary">
        ← AI Business Assistant
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
