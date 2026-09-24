import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBasket, Heart, Tag, Trash2, Bookmark } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { useCartStore } from "@/store/cart";
import { formatNaira } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/types";
import { useStorefrontStore } from "@/store/storefront";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — Vendura" },
      { name: "description", content: "Review items in your Vendura cart." },
      { property: "og:title", content: "Cart — Vendura" },
      { property: "og:description", content: "Review items in your Vendura cart." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const activeStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);
  const items = useCartStore((s) => s.items);
  const remove = useCartStore((s) => s.remove);
  const updateQty = useCartStore((s) => s.updateQty);
  const saveForLater = useCartStore((s) => s.saveForLater);
  const clear = useCartStore((s) => s.clear);

  const activeItems = items.filter((i) => !i.savedForLater);
  const savedItems = items.filter((i) => i.savedForLater);

  // Group by store
  const byStore = activeItems.reduce<Record<string, CartItem[]>>((acc, item) => {
    (acc[item.storeId] ??= []).push(item);
    return acc;
  }, {});

  const subtotal = activeItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    if (activeStoreSlug) {
      navigate({ to: "/store/$storeSlug", params: { storeSlug: activeStoreSlug }, hash: "store-products" });
      return;
    }
    navigate({ to: "/marketplace" });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader />
        <EmptyState
          icon={<ShoppingBasket className="h-7 w-7" />}
          title="Your cart is empty"
          description="Browse the marketplace and add items to your cart."
          action={activeStoreSlug ? (
            <Link to="/store/$storeSlug" params={{ storeSlug: activeStoreSlug }} hash="store-products" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse this store</Link>
          ) : (
            <Link to="/marketplace" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse Marketplace</Link>
          )}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={goBack} aria-label="Go back" title="Go back" className="text-muted-foreground transition-colors hover:text-primary">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-2xl font-bold text-foreground">Cart</h1>
          </div>
          <button
            onClick={() => {
              clear();
              toast.success("Cart cleared");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* Items grouped by store */}
          <div className="space-y-4">
            {Object.entries(byStore).map(([storeId, storeItems]) => {
              return (
                <div
                  key={storeId}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Store header */}
                  <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2.5">
                    <span className="text-sm font-semibold text-primary">Seller order</span>
                    <span className="text-xs text-muted-foreground">
                      · {storeItems.length} item{storeItems.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Items */}
                  <div className="divide-y divide-border">
                    {storeItems.map((item) => {
                      return (
                        <div key={item.id} className="flex gap-3 p-4">
                          <Link
                            to="/product/$slug"
                            params={{ slug: item.productSlug }}
                            className="shrink-0"
                          >
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="h-20 w-20 rounded-lg border border-border object-cover"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link
                              to="/product/$slug"
                              params={{ slug: item.productSlug }}
                              className="text-sm font-medium text-foreground hover:text-primary line-clamp-2"
                            >
                              {item.productName}
                            </Link>
                            {item.variantId &&
                              (() => {
                                return (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    Selected variant
                                  </p>
                                );
                              })()}
                            {item.negotiated && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-xs font-semibold text-success">
                                <Tag className="h-3 w-3" /> Agreed:{" "}
                                {formatNaira(item.negotiated.agreedPrice)}
                              </span>
                            )}
                            <div className="mt-2 flex items-center gap-3">
                              <QuantityStepper
                                value={item.quantity}
                                onChange={(v) => updateQty(item.id, v)}
                                min={1}
                                max={item.availableStock}
                              />
                              <button
                                onClick={() => {
                                  remove(item.id);
                                  toast.success("Removed");
                                }}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  saveForLater(item.id, true);
                                  toast.success("Saved for later");
                                }}
                                className="text-xs text-muted-foreground hover:text-primary"
                                aria-label="Save for later"
                              >
                                <Bookmark className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatNaira(item.unitPrice * item.quantity)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Saved for later */}
            {savedItems.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-accent/30 px-4 py-2.5">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Heart className="h-4 w-4" /> Saved for later ({savedItems.length})
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {savedItems.map((item) => {
                    return (
                      <div key={item.id} className="flex gap-3 p-4">
                        <Link
                          to="/product/$slug"
                          params={{ slug: item.productSlug }}
                          className="shrink-0"
                        >
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-16 w-16 rounded-lg border border-border object-cover"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to="/product/$slug"
                            params={{ slug: item.productSlug }}
                            className="text-sm font-medium text-foreground hover:text-primary line-clamp-1"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-sm font-semibold text-foreground">
                            {formatNaira(item.unitPrice)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            saveForLater(item.id, false);
                            toast.success("Moved to cart");
                          }}
                          className="self-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                        >
                          Move to cart
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">Order Summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({activeItems.length} items)
                  </span>
                  <span className="font-medium text-foreground">{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-muted-foreground">Calculated at checkout</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-lg font-bold text-primary">{formatNaira(subtotal)}</span>
                  </div>
                </div>
              </div>
              <Link
                to="/checkout"
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Proceed to Checkout
              </Link>
              <Link
                to="/marketplace"
                className="mt-2 block text-center text-sm text-muted-foreground hover:text-primary"
              >
                Continue shopping
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Prices are validated at checkout. Negotiated prices require backend offer
                verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
