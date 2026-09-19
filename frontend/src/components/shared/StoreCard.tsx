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
        {store.bannerUrl && (
          <img
            src={store.bannerUrl}
            alt={store.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-foreground group-hover:text-primary">
            {store.name}
          </h3>
          {store.verified && (
            <BadgeCheck className="h-4 w-4 text-primary" />
          )}
        </div>
        {store.tagline && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {store.tagline}
          </p>
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
