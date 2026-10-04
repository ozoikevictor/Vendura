import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, ShoppingBasket } from "lucide-react";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlist";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { RatingStars } from "./RatingStars";
import { PriceTag } from "./PriceTag";
import { discountPercent } from "@/utils/format";
import { toast } from "sonner";
import { useState } from "react";
import { addWishlistItem, removeWishlistItem } from "@/services/engagementService";

interface ProductCardProps {
  product: Product;
  storeName?: string;
  storeSlug?: string;
  className?: string;
}

export function ProductCard({ product, storeName, storeSlug, className }: ProductCardProps) {
  const wishlist = useWishlistStore();
  const user = useAuthStore((state) => state.user);
  const addToCart = useCartStore((s) => s.addByProductId);
  const navigate = useNavigate();
  const isWishlisted = wishlist.has(product.id);
  const outOfStock = product.stock === 0;
  const discount = discountPercent(product.price, product.oldPrice);
  const [imageFailed, setImageFailed] = useState(false);
  const hasReviews = product.reviewCount > 0;
  const requiresSelection = product.variantOptions.length > 0 || product.variants.length > 0;

  async function handleWishlistToggle() {
    if (!user) {
      toast.error("Please log in to save items to your wishlist.");
      return;
    }
    const nextWishlisted = !isWishlisted;
    if (nextWishlisted) wishlist.add(product.id);
    else wishlist.remove(product.id);
    try {
      const ids = nextWishlisted
        ? await addWishlistItem(product.id)
        : await removeWishlistItem(product.id);
      wishlist.setIds(ids);
      toast.success(nextWishlisted ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      if (nextWishlisted) wishlist.remove(product.id);
      else wishlist.add(product.id);
      toast.error(error instanceof Error ? error.message : "Could not update wishlist");
    }
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-shadow hover:shadow-frost",
        className,
      )}
    >
      {/* Image */}
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {!imageFailed && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
              outOfStock && "opacity-60",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted px-5 text-center text-xs font-medium text-muted-foreground">
            Image unavailable
          </div>
        )}
        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount != null && (
            <span className="rounded-md bg-clay px-1.5 py-0.5 text-xs font-bold text-clay-foreground shadow-sm">
              -{discount}%
            </span>
          )}
          {product.negotiable && (
            <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary shadow-sm">
              Negotiable
            </span>
          )}
        </div>
        {outOfStock && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-foreground/80 px-3 py-1 text-xs font-semibold text-background">
              Out of stock
            </span>
          </span>
        )}
      </Link>

      {/* Wishlist heart */}
      <button
        type="button"
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(e) => {
          e.preventDefault();
          void handleWishlistToggle();
        }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-glass-strong backdrop-blur-md shadow-sm transition-colors hover:bg-card"
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors",
            isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground",
          )}
        />
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {/* Store name */}
        {storeName && storeSlug && (
          <Link
            to="/store/$storeSlug"
            params={{ storeSlug }}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            {storeName}
          </Link>
        )}

        {/* Product name */}
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
        >
          {product.name}
        </Link>

        {/* Rating */}
        {hasReviews ? (
          <RatingStars rating={product.rating} size={12} showValue count={product.reviewCount} />
        ) : (
          <p className="text-xs text-muted-foreground">No reviews yet</p>
        )}

        {/* Price + basket */}
        <div className="mt-auto flex items-end justify-between pt-1">
          <PriceTag
            price={product.price}
            {...(product.oldPrice ? { oldPrice: product.oldPrice } : {})}
            size="sm"
          />
          <button
            type="button"
            aria-label={requiresSelection ? "Choose options" : "Add to cart"}
            disabled={outOfStock}
            onClick={(e) => {
              e.preventDefault();
              if (requiresSelection) {
                void navigate({ to: "/product/$slug", params: { slug: product.slug } });
                return;
              }
              addToCart(product, 1);
              toast.success("Added to cart");
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingBasket className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
