import { Link } from "@tanstack/react-router";
import { Star, MapPin, BadgeCheck } from "lucide-react";
import type { Store } from "@/types";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/utils/format";

interface StoreCardProps {
  store: Store;
  className?: string;
}

export function StoreCard({ store, className }: StoreCardProps) {
  const initials = getStoreInitials(store.name);

  return (
    <Link
      to="/store/$storeSlug"
      params={{ storeSlug: store.slug }}
      className={cn(
        "group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-frost",
        className,
      )}
    >
      {/* Banner */}
      <div className="relative h-24 overflow-hidden bg-muted">
        {store.bannerUrl ? (
          <img
            src={store.bannerUrl}
            alt={store.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_15%_25%,rgba(187,247,208,0.36),transparent_30%),linear-gradient(135deg,#052e1b_0%,#0f6b3a_52%,#a7f3d0_100%)] transition-transform duration-500 group-hover:scale-105">
            <div className="absolute -left-12 bottom-[-70%] h-40 w-60 rotate-[-12deg] rounded-[45%] bg-white/14" />
            <div className="absolute right-[-18%] top-[-65%] h-48 w-48 rounded-[42%] bg-emerald-100/25" />
            <div className="absolute bottom-[-55%] right-[18%] h-36 w-36 rounded-[40%] border border-white/20 bg-emerald-950/20" />
            <div className="relative text-center text-white drop-shadow-sm">
              <p className="font-display text-4xl font-black leading-none">{initials}</p>
              <p className="mt-1 max-w-[11rem] truncate text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-50/90">
                {store.name}
              </p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-foreground group-hover:text-primary">{store.name}</h3>
          {store.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
        </div>
        {store.tagline && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{store.tagline}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-clay text-clay" />
            {store.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {store.location.city}
          </span>
          <span>{formatNaira(store.productCount, { compact: true })} products</span>
        </div>
      </div>
    </Link>
  );
}

function getStoreInitials(storeName: string) {
  const ignore = new Set([
    "and",
    "the",
    "store",
    "shop",
    "limited",
    "ltd",
    "enterprise",
    "enterprises",
  ]);
  const words = storeName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const meaningful = words.filter((word) => !ignore.has(word.toLowerCase()));
  const source = meaningful.length > 0 ? meaningful : words;
  const initials = source
    .slice(0, source.length === 1 ? 2 : 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  if (initials.length >= 2) return initials.slice(0, 3);
  return (storeName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "VR").toUpperCase();
}
