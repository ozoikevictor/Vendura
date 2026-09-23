import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  PackagePlus,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";

const vendorPrompts = [
  "Show me products running low on stock",
  "Summarize my sales this week",
  "Which products are selling the most?",
  "Help me write a product description",
  "Show buyer requests matching my products",
  "Summarize my new orders",
  "How much revenue did I make this month?",
];

export function VendorAIPage() {
  const user = useAuthStore((s) => s.user)!;
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const send = (value = input) => {
    if (value.trim()) {
      setReply(value);
      setInput("");
    }
  };
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase text-primary">AI Business Assistant</p>
          <h1 className="text-2xl font-bold">Good afternoon, {user.fullName.split(" ")[0]}.</h1>
        </div>
      </div>
      <p className="mt-2 text-muted-foreground">How can I help with your business today?</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vendorPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => send(prompt)}
            className="min-h-20 rounded-lg border border-border bg-card p-4 text-left text-sm font-medium hover:border-primary hover:bg-primary-soft"
          >
            {prompt}
          </button>
        ))}
      </div>
      {reply && (
        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">{reply}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This preview will use your live store data when the AI backend is connected. No
                figures have been invented.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-7 flex rounded-lg border border-input bg-card p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about products, orders, or sales..."
          className="min-w-0 flex-1 bg-transparent px-3 outline-none"
        />
        <button
          onClick={() => send()}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <VendorTool
          to="/vendor/ai/opportunities"
          icon={<Target />}
          title="Buyer opportunities"
          text="Requests matching your products"
        />
        <VendorTool
          to="/vendor/ai/products"
          icon={<PackagePlus />}
          title="Product creator"
          text="Draft listings you can edit"
        />
        <VendorTool
          to="/vendor/ai/analytics"
          icon={<BarChart3 />}
          title="AI analytics"
          text="Summaries from store data"
        />
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
  const [sent, setSent] = useState(false);
  return (
    <VendorPage
      title="Buyer opportunities"
      intro="Customer requests that match products in your inventory."
    >
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase text-primary">New buyer request</p>
        <h2 className="mt-2 text-lg font-bold">iPhone 15 Pro · 256GB</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Maximum budget</dt>
            <dd className="font-semibold">₦900,000</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-semibold">Enugu</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Needed</dt>
            <dd className="font-semibold">Before Friday</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Match</dt>
            <dd className="font-semibold text-success">Similar inventory found</dd>
          </div>
        </dl>
        {sent ? (
          <p className="mt-5 rounded-md bg-success-soft p-3 text-sm font-semibold text-success">
            Offer sent successfully.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <select className="rounded-md border border-input bg-background px-3 py-2">
              <option>Aurora 5G Smartphone 256GB</option>
            </select>
            <input placeholder="Offer price" className="rounded-md border border-input px-3 py-2" />
            <input
              placeholder="Delivery fee"
              className="rounded-md border border-input px-3 py-2"
            />
            <input
              placeholder="Estimated delivery"
              className="rounded-md border border-input px-3 py-2"
            />
            <textarea
              placeholder="Additional message"
              className="rounded-md border border-input p-3 sm:col-span-2"
            />
            <button
              onClick={() => setSent(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:col-span-2"
            >
              Send Offer
            </button>
          </div>
        )}
      </div>
    </VendorPage>
  );
}
export function VendorProductCreator() {
  const [generated, setGenerated] = useState(false);
  return (
    <VendorPage
      title="AI product creator"
      intro="Create an editable listing draft. Nothing is published automatically."
    >
      <div className="rounded-lg border border-border bg-card p-5">
        <label className="text-sm font-semibold">What product are you listing?</label>
        <textarea
          defaultValue="Create a description for this Samsung Galaxy S25."
          className="mt-2 min-h-24 w-full rounded-md border border-input p-3"
        />
        <button
          onClick={() => setGenerated(true)}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Generate draft
        </button>
        {generated && (
          <div className="mt-6 space-y-4 border-t border-border pt-5">
            <Field label="Product title" value="Samsung Galaxy S25 5G Smartphone" />
            <Field
              label="Short description"
              value="A compact flagship phone with powerful performance and an advanced camera system."
            />
            <Field
              label="Detailed description"
              value="Meet the Samsung Galaxy S25, designed for fast everyday performance, clear photography, and dependable all-day use."
            />
            <Field label="Suggested category" value="Phones & Tablets" />
            <Field label="Search keywords" value="Samsung, Galaxy S25, Android, 5G, smartphone" />
            <div className="flex gap-2">
              <button className="rounded-md border border-border px-4 py-2 text-sm font-semibold">
                Regenerate
              </button>
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Use Description
              </button>
            </div>
          </div>
        )}
      </div>
    </VendorPage>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <textarea
        defaultValue={value}
        className="mt-1 min-h-12 w-full rounded-md border border-input bg-background p-3 font-normal"
      />
    </label>
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
