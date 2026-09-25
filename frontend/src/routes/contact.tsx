import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HumanCheck } from "@/components/shared/HumanCheck";
import { createSupportRequest, type SupportCategory } from "@/services/supportService";
import { getErrorMessage } from "@/services/api";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "order" as SupportCategory,
    subject: "",
    message: "",
  });
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!captchaToken) {
      setError("Complete the security check.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await createSupportRequest({ ...form, captchaToken });
      setReference(result.reference);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not send your request."));
      setCaptchaRefresh((value) => value + 1);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader publicMode />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[20rem_1fr] lg:px-8">
        <aside>
          <p className="text-xs font-semibold uppercase text-primary">Support</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Contact Vendura</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tell us what happened and include an order, payment, store, or conversation reference
            when available.
          </p>
          <div className="mt-6 border-t border-border pt-5">
            <Mail className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">Online support</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this form while our dedicated company email is being established.
            </p>
          </div>
        </aside>
        {reference ? (
          <section className="self-start rounded-lg border border-success/30 bg-card p-6">
            <CheckCircle2 className="h-9 w-9 text-success" />
            <h2 className="mt-4 text-xl font-bold">Request received</h2>
            <p className="mt-2 text-sm text-muted-foreground">Keep this support reference:</p>
            <p className="mt-2 font-mono text-lg font-bold text-primary">{reference}</p>
            <button
              type="button"
              onClick={() => {
                setReference("");
                setForm({ name: "", email: "", category: "order", subject: "", message: "" });
                setCaptchaRefresh((value) => value + 1);
              }}
              className="mt-5 text-sm font-semibold text-primary hover:underline"
            >
              Send another request
            </button>
          </section>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={set("name")}
                  className={fieldClass}
                />
              </Field>
              <Field label="Email">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  className={fieldClass}
                />
              </Field>
            </div>
            <Field label="What do you need help with?">
              <select value={form.category} onChange={set("category")} className={fieldClass}>
                <option value="order">Order</option>
                <option value="payment">Payment or refund</option>
                <option value="vendor">Seller account</option>
                <option value="account">Customer account</option>
                <option value="technical">Technical problem</option>
                <option value="safety">Safety concern</option>
                <option value="other">Something else</option>
              </select>
            </Field>
            <Field label="Subject">
              <input
                required
                minLength={3}
                maxLength={150}
                value={form.subject}
                onChange={set("subject")}
                className={fieldClass}
              />
            </Field>
            <Field label="Message">
              <textarea
                required
                minLength={10}
                maxLength={3000}
                rows={6}
                value={form.message}
                onChange={set("message")}
                className={`${fieldClass} resize-y`}
                placeholder="Include useful details, but never send your password, card PIN, or one-time code."
              />
            </Field>
            <HumanCheck onToken={setCaptchaToken} refreshKey={captchaRefresh} />
            <button
              type="submit"
              disabled={loading || !captchaToken}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {loading ? "Sending..." : "Send request"}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary";
