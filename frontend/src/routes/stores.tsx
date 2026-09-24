import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Store as StoreIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoreCard } from "@/components/shared/StoreCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { DataLoader } from "@/components/shared/DataLoader";
import { getStores } from "@/services/storeService";

export const Route = createFileRoute("/stores")({
  head: () => ({
    meta: [
      { title: "Stores — Vendura" },
      { name: "description", content: "Browse real vendor stores on Vendura." },
      { property: "og:title", content: "Stores — Vendura" },
      { property: "og:description", content: "Browse vendor stores on Vendura." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoresPage,
});

function StoresPage() {
  const [query, setQuery] = useState("");
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: getStores,
  });

  const filteredStores = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((store) =>
      [store.name, store.tagline, store.description, store.location.city, store.location.state]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [query, stores]);

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Vendors"
          title="Stores"
          description="Choose a seller and shop directly from their storefront."
        />

        <div className="mt-5 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search stores by name, city, or category..."
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <DataLoader label="Loading stores" className="min-h-80" />
          ) : filteredStores.length === 0 ? (
            <EmptyState
              title="No stores found"
              description={query ? "Try another store name or location." : "Vendor stores will appear here when sellers publish products."}
              icon={<StoreIcon className="h-8 w-8" />}
              action={<Link to="/marketplace" className="text-sm font-semibold text-primary hover:underline">Browse marketplace</Link>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
