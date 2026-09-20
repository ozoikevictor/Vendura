import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, BadgeCheck, MapPin, Package, Star } from "lucide-react";
import type { Store } from "@/types";
import { useAuthStore } from "@/store/auth";
import { useStorefrontStore } from "@/store/storefront";

export function VerifiedStoreCard({ store }: { store: Store }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setActiveStore = useStorefrontStore((state) => state.setActiveStore);

  function openStore() {
    setActiveStore(store.slug);
    if (user?.role === "customer") {
      navigate({ to: "/store/$storeSlug", params: { storeSlug: store.slug } });
      return;
    }
    navigate({ to: "/explore" });
  }

  return (
    <button type="button" onClick={openStore} className="group verified-store-card overflow-hidden rounded-xl border border-border bg-card text-left shadow-card" aria-label={`Visit ${store.name}`}>
      <div className="relative h-36 overflow-hidden bg-muted">
        {store.bannerUrl ? (
          <img src={store.bannerUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary-soft text-4xl font-bold text-primary/35">{store.name.charAt(0).toUpperCase()}</div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold text-primary shadow-card">
          <BadgeCheck className="h-3.5 w-3.5" /> Verified
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-primary-soft font-bold text-primary">
            {store.logoUrl ? <img src={store.logoUrl} alt={`${store.name} logo`} className="h-full w-full object-cover" /> : store.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">{store.name}</h3>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{store.tagline || "Shop trusted products from this seller"}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-clay text-clay" /> {store.rating.toFixed(1)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {store.location.city}, {store.location.state}</span>
          <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {store.productCount} products</span>
        </div>
      </div>
    </button>
  );
}
