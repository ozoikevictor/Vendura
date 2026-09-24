import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  Boxes,
  PackagePlus,
  Plus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/services/api";
import { searchVendorAI, type VendorAIResult } from "@/services/vendorService";

const vendorPrompts = [
  "What is my total revenue?",
  "Show my payouts for today",
  "What is my newest order?",
  "Which products are out of stock?",
  "What do I need to restock?",
  "Show buyer requests matching my products",
];

type VendorTurn = VendorAIResult & { message: string };

export function VendorAIPage() {
  const user = useAuthStore((s) => s.user)!;
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<VendorTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatScroll = useRef<HTMLDivElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (turns.length === 0 && !loading) return;
    chatScroll.current?.scrollTo({ top: chatScroll.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

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
    setInput("");
    setError("");
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col overflow-hidden bg-card sm:rounded-lg sm:border sm:border-border">
      <header className="hidden h-16 shrink-0 items-center gap-3 border-b border-border px-5 sm:flex">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold">AI Business Assistant</h1>
          <p className="text-xs text-success">Connected to your live store</p>
        </div>
        <button type="button" onClick={newChat} title="Start a new chat" aria-label="Start a new chat" className="ml-auto flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold hover:bg-accent">
          <Plus className="h-4 w-4" /> New chat
        </button>
      </header>
      <div ref={chatScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
        <header className="-mx-3 -mt-3 mb-4 flex h-16 items-center gap-3 border-b border-border px-3 sm:hidden">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold sm:text-base">AI Business Assistant</h1>
            <p className="text-xs text-success">Connected to your live store</p>
          </div>
          <button
            type="button"
            onClick={newChat}
            title="Start a new chat"
            aria-label="Start a new chat"
            className="ml-auto flex h-9 items-center gap-2 rounded-md border border-border px-2.5 text-xs font-semibold hover:bg-accent sm:px-3"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New chat</span>
          </button>
        </header>
        {turns.length === 0 ? (
          <div className="mx-auto max-w-3xl py-4 sm:py-10">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Hello {user.fullName.split(" ")[0]}, what would you like to know about your store?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">I use your real products, orders, sales, inventory, customers, and buyer requests.</p>
              </div>
            </div>
            <div className="my-5 h-px bg-border" />
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {vendorPrompts.map((prompt) => (
                <button key={prompt} type="button" onClick={() => send(prompt)} className="rounded-full border border-border bg-background px-3 py-2 text-left text-xs font-medium hover:border-primary hover:bg-primary-soft sm:text-sm">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {turns.map((turn, index) => (
              <div key={`${turn.message}-${index}`} className="space-y-3 border-b border-border pb-5 last:border-0">
                <div className="ml-auto max-w-[88%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground sm:px-4 sm:py-3">{turn.message}</div>
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary"><Sparkles className="h-4 w-4" /></span>
                  <p className="pt-1 text-sm leading-6">{turn.response}</p>
                </div>
                {turn.metrics.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pl-11 sm:grid-cols-3">
                    {turn.metrics.map((metric) => <div key={metric.label} className="rounded-md border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="mt-1 font-bold">{metric.value}</p></div>)}
                  </div>
                )}
                {turn.items.length > 0 && (
                  <div className="space-y-2 pl-0 sm:pl-11">
                    {turn.items.map((item) => (
                      <a key={`${item.type}-${item.id}`} href={item.href} className="flex items-center gap-3 rounded-md border border-border bg-background p-3 hover:border-primary hover:bg-primary-soft">
                        {item.image ? <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-soft text-primary"><Boxes className="h-4 w-4" /></span>}
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.meta}</span></span>
                        <span className="text-xs font-semibold text-primary">Open</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {loading && <div className="mx-auto flex max-w-3xl items-center gap-3 text-sm text-muted-foreground"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary"><Sparkles className="h-4 w-4 animate-pulse" /></span>Checking your store data...</div>}
      </div>

      <form onSubmit={(event: FormEvent) => { event.preventDefault(); send(); }} className="shrink-0 border-t border-border bg-card p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-lg border border-input bg-background p-2">
          <textarea ref={composerInput} value={input} onPointerDown={(event) => { if (document.activeElement !== composerInput.current) { event.preventDefault(); composerInput.current?.focus({ preventScroll: true }); } }} onFocus={() => { requestAnimationFrame(() => chatScroll.current?.scrollTo({ top: chatScroll.current.scrollHeight })); }} onChange={(event) => { setInput(event.target.value); if (error) setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={1} placeholder="Ask about your store..." className="max-h-28 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-base outline-none sm:text-sm" />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </div>
        {error && <p role="alert" className="mx-auto mt-2 max-w-3xl text-xs font-medium text-destructive">{error}</p>}
      </form>
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
      .catch((loadError) => setError(getErrorMessage(loadError, "Buyer opportunities could not be loaded.")));
  }, []);
  return (
    <VendorPage
      title="Buyer opportunities"
      intro="Customer requests that match products in your inventory."
    >
      {!result && !error && <p className="text-sm text-muted-foreground">Checking live buyer requests...</p>}
      {error && <p className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
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
        <p className="text-sm text-muted-foreground">Product drafting is not connected yet. Add or edit products from the Products section so no generated details are mistaken for live store data.</p>
        <Link to="/vendor/products/new" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add a product</Link>
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
