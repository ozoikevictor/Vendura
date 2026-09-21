import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, ExternalLink, Eye, Loader2, Store, UserPlus } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getStoreBySlug } from "@/services/storeService";
import { getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useStorefrontStore } from "@/store/storefront";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Open a Store - Vendura" },
      { name: "description", content: "Open a Vendura storefront, start selling, or explore the demo store." },
    ],
  }),
  component: StoreGatewayPage,
});

function getStoreSlug(value: string) {
  const input = value.trim();
  if (!input) return "";
  try {
    const url = new URL(input.includes("://") ? input : `https://${input}`);
    const match = url.pathname.match(/^\/store\/([^/?#]+)/i);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // Plain storefront slugs are handled below.
  }
  return input.replace(/^\/+|\/+$/g, "").toLowerCase();
}

function StoreGatewayPage() {
  const navigate = useNavigate();
  const isCustomer = useAuthStore((state) => state.user?.role === "customer");
  const setActiveStore = useStorefrontStore((state) => state.setActiveStore);
  const [storeLink, setStoreLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function openStore(event: React.FormEvent) {
    event.preventDefault();
    const slug = getStoreSlug(storeLink);
    if (!slug || slug.includes(" ")) {
      setError("Paste a valid Vendura store link or enter the store name from the link.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const store = await getStoreBySlug(slug);
      setActiveStore(store.slug);
      navigate({ to: "/store/$storeSlug", params: { storeSlug: store.slug } });
    } catch (requestError) {
      setError(getErrorMessage(requestError, "We could not find that store. Check the link and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen lagoon-wash">
      {isCustomer ? <MarketplaceHeader /> : <PublicHeader />}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <section className="animate-rise text-center">
          <p className="eyebrow">Choose your next step</p>
          <h1 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-bold text-foreground sm:text-5xl">
            {isCustomer ? "Open a seller's store" : "Open a seller's store or launch your own"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {isCustomer
              ? "Paste a vendor storefront link below to start shopping."
              : "Vendura stores are reached through each seller's unique link. Paste one below, explore our demonstration, or create a store for your business."}
          </p>
        </section>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_0.8fr_0.8fr]">
          <section className="animate-settle rounded-xl border border-primary/25 bg-card p-6 shadow-frost sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ExternalLink className="h-6 w-6" /></div>
            <h2 className="mt-5 text-xl font-semibold text-foreground">Open a vendor link</h2>
            <p className="mt-2 text-sm text-muted-foreground">Paste the storefront link a seller shared with you. You can browse before creating a customer account.</p>
            <form onSubmit={openStore} className="mt-6">
              <label htmlFor="store-link" className="mb-2 block text-sm font-medium text-foreground">Vendor store link</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="store-link"
                  value={storeLink}
                  onChange={(event) => { setStoreLink(event.target.value); setError(""); }}
                  placeholder="vendura-sand.vercel.app/store/store-name"
                  className="min-w-0 flex-1 rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />} Open store
                </button>
              </div>
              {error && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{error}</p>}
            </form>
          </section>

          {!isCustomer && <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary"><UserPlus className="h-6 w-6" /></div>
            <h2 className="mt-5 text-xl font-semibold text-foreground">Start selling</h2>
            <p className="mt-2 text-sm text-muted-foreground">Create your seller account, add products, and receive a storefront link to share with customers.</p>
            <Link to="/vendor-register" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:underline">Create seller account <ArrowRight className="h-4 w-4" /></Link>
          </section>}

          {!isCustomer && <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-clay-soft text-clay"><Eye className="h-6 w-6" /></div>
            <h2 className="mt-5 text-xl font-semibold text-foreground">View the demo</h2>
            <p className="mt-2 text-sm text-muted-foreground">See how browsing, products, categories, and the shopping experience work using sample content.</p>
            <Link to="/marketplace" className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:underline">Explore demo store <ArrowRight className="h-4 w-4" /></Link>
          </section>}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4 text-primary" /> Sellers can copy their unique link from the vendor dashboard.
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
