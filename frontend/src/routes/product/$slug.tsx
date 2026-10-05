import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Heart,
  ShoppingBasket,
  MessageSquare,
  Zap,
  Check,
  Truck,
  ShieldCheck,
  Star,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProductCard } from "@/components/shared/ProductCard";
import { RatingStars } from "@/components/shared/RatingStars";
import { PriceTag } from "@/components/shared/PriceTag";
import { QuantityStepper } from "@/components/shared/QuantityStepper";
import { DataLoader } from "@/components/shared/DataLoader";
import { BackLink } from "@/components/shared/BackLink";
import { useQuery } from "@tanstack/react-query";
import { getProductBySlug, getProductReviews, getRelatedProducts } from "@/services/productService";
import { getStoreById } from "@/services/storeService";
import { startConversation } from "@/services/messageService";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useAuthStore } from "@/store/auth";
import { addWishlistItem, removeWishlistItem } from "@/services/engagementService";
import { stores } from "@/data/stores";
import { categories } from "@/data/categories";
import { formatNaira, discountPercent } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  breadcrumbJsonLd,
  canonicalLink,
  fetchPublicApi,
  productJsonLd,
  seoMeta,
  truncateSeoText,
  jsonLdScript,
} from "@/lib/seo";
import type { Product, Store } from "@/types";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await fetchPublicApi<Product>(
      `/products/slug/${encodeURIComponent(params.slug)}`,
    );
    const store = product
      ? await fetchPublicApi<Store>(`/stores/${encodeURIComponent(product.storeId)}`)
      : null;
    return { product, store };
  },
  head: ({ params, loaderData }) => {
    const product = loaderData?.product;
    const store = loaderData?.store ?? stores.find((item) => item.id === product?.storeId);
    const category = categories.find((item) => item.id === product?.categoryId);
    const title = product
      ? `${product.name}${store ? ` by ${store.name}` : ""} | Vendraza`
      : "Product | Vendraza";
    const description = product
      ? truncateSeoText(
          `${product.description} Shop ${product.name}${store ? ` from ${store.name}` : ""} on Vendraza.`,
        )
      : "View product details, price, seller information, and delivery options on Vendraza.";
    const path = `/product/${params.slug}`;
    return {
      meta: seoMeta({
        title,
        description,
        path,
        image: product?.images[0],
        type: "product",
        robots: product ? "index, follow" : "noindex, follow",
      }),
      links: canonicalLink(path),
      scripts: product
        ? [
            jsonLdScript(productJsonLd(product, store, category)),
            jsonLdScript(
              breadcrumbJsonLd([
                { name: "Home", path: "/" },
                {
                  name: category?.name ?? "Marketplace",
                  path: category ? `/categories/${category.slug}` : "/marketplace",
                },
                { name: product.name, path },
              ]),
            ),
          ]
        : [],
    };
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const addToCart = useCartStore((s) => s.add);
  const wishlist = useWishlistStore();
  const user = useAuthStore((state) => state.user);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIdx, setselectedVariantIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [startingConversation, setStartingConversation] = useState(false);
  const openedFromAI =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("from") === "customer-ai";

  const goBack = () => {
    if (openedFromAI && window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(openedFromAI ? "/customer/ai" : "/marketplace");
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProductBySlug(slug),
  });

  const { data: related } = useQuery({
    queryKey: ["related", slug],
    queryFn: () => getRelatedProducts(product!, 5),
    enabled: !!product,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["product-reviews", product?.id],
    queryFn: () => getProductReviews(product!.id),
    enabled: Boolean(product),
  });

  const { data: liveStore } = useQuery({
    queryKey: ["store", product?.storeId],
    queryFn: () => getStoreById(product!.storeId),
    enabled: Boolean(product),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col lagoon-wash">
        <MarketplaceHeader />
        <DataLoader label="Loading product details" className="min-h-[65dvh] flex-1" />
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col lagoon-wash">
        <MarketplaceHeader />
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Product not found</h1>
            <Link
              to="/marketplace"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Browse marketplace
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const store = liveStore ?? stores.find((s) => s.id === product.storeId);
  const isWishlisted = wishlist.has(product.id);

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
  const outOfStock = product.stock === 0;
  const lowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const discount = discountPercent(product.price, product.oldPrice);
  const selectedVariant =
    product.variants.length > 0 ? (product.variants[selectedVariantIdx] ?? null) : null;
  const unitPrice = selectedVariant?.price ?? product.price;

  const handleAddToCart = () => {
    addToCart(product, selectedVariant, qty);
    toast.success("Added to cart");
  };

  const handleBuyNow = () => {
    addToCart(product, selectedVariant, qty);
    navigate({ to: "/cart" });
  };

  async function handleMessageSeller() {
    if (startingConversation) return;
    setStartingConversation(true);
    try {
      const conversation = await startConversation(product!.id);
      navigate({ to: "/messages/$conversationId", params: { conversationId: conversation.id } });
    } catch {
      toast.error("Please log in as a customer to message this seller.");
    } finally {
      setStartingConversation(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {openedFromAI ? (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> AI Assistant
            </button>
          ) : (
            <Link to="/marketplace" className="hover:text-primary">
              Marketplace
            </Link>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <img
                src={product.images[selectedImage]}
                alt={`${product.name} on Vendraza`}
                className="aspect-square w-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                      i === selectedImage
                        ? "border-primary"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <img
                      src={img}
                      alt={`${product.name} image ${i + 1} on Vendraza`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {/* Store link */}
            {store && (
              <Link
                to="/store/$storeSlug"
                params={{ storeSlug: store.slug }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {store.name}
                {store.verified && <ShieldCheck className="h-3.5 w-3.5" />}
              </Link>
            )}

            <div className="mt-1.5 flex min-w-0 items-start gap-2">
              <BackLink fallback={openedFromAI ? "/customer/ai" : "/marketplace"} />
              <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                {product.name}
              </h1>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <RatingStars
                rating={product.rating}
                size={14}
                showValue
                count={product.reviewCount}
              />
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">{product.soldCount} sold</span>
            </div>

            {/* Price */}
            <div className="mt-4">
              <PriceTag
                price={unitPrice}
                {...(product.oldPrice ? { oldPrice: product.oldPrice } : {})}
                size="lg"
              />
              {discount != null && (
                <span className="ml-2 rounded-md bg-clay px-2 py-0.5 text-xs font-bold text-clay-foreground">
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Stock */}
            <div className="mt-3">
              {outOfStock ? (
                <span className="text-sm font-medium text-destructive">Out of stock</span>
              ) : lowStock ? (
                <span className="text-sm font-medium text-warning">
                  Only {product.stock} left — order soon!
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-success">
                  <Check className="h-4 w-4" /> In stock
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variantOptions.length > 0 && (
              <div className="mt-4 space-y-3">
                {product.variantOptions.map((opt) => (
                  <div key={opt.name}>
                    <p className="mb-1.5 text-sm font-medium text-foreground">{opt.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {opt.values.map((val) => {
                        const idx = product.variants.findIndex(
                          (v) => v.attributes[opt.name] === val,
                        );
                        const isSelected = idx === selectedVariantIdx;
                        return (
                          <button
                            key={val}
                            onClick={() => idx >= 0 && setselectedVariantIdx(idx)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                              isSelected
                                ? "border-primary bg-primary-soft text-primary"
                                : "border-border text-foreground hover:bg-accent",
                            )}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity + actions */}
            <div className="mt-5 flex items-center gap-3">
              <QuantityStepper
                value={qty}
                onChange={setQty}
                min={1}
                max={Math.max(1, product.stock)}
              />
              {product.negotiable && (
                <span className="rounded-md bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
                  Negotiable
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingBasket className="h-4 w-4" />
                Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={outOfStock}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Zap className="h-4 w-4" />
                Buy Now
              </button>
              <button
                onClick={() => void handleWishlistToggle()}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className={cn(
                  "flex items-center justify-center rounded-xl border px-3 py-2.5 transition-colors",
                  isWishlisted
                    ? "border-destructive text-destructive"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Heart className={cn("h-4 w-4", isWishlisted && "fill-destructive")} />
              </button>
              <button
                onClick={handleMessageSeller}
                disabled={startingConversation}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                <MessageSquare className="h-4 w-4" />
                {startingConversation ? "Opening..." : "Message Seller"}
              </button>
            </div>

            {/* Delivery info */}
            <div className="mt-6 rounded-xl border border-border bg-card p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Truck className="h-4 w-4 text-primary" /> Delivery Options
              </h3>
              <div className="mt-2 space-y-1.5">
                {product.deliveryOptions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium text-foreground">
                      {d.fee === 0 ? "Free" : formatNaira(d.fee)} · {d.etaDays[0]}–{d.etaDays[1]}{" "}
                      days
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Final delivery fee calculated at checkout.
              </p>
            </div>

            {/* Seller card */}
            {store && (
              <Link
                to="/store/$storeSlug"
                params={{ storeSlug: store.slug }}
                className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-primary-soft text-sm font-bold text-primary">
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={`${store.name} store on Vendraza`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    store.name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">{store.name}</p>
                    {store.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⭐ {store.rating} · {store.reviewCount} reviews · {store.productCount} products
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            )}
          </div>
        </div>

        {/* Description & Specs */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {product.description}
            </p>
          </div>
          {product.specifications.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">Specifications</h2>
              <dl className="mt-2 divide-y divide-border">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex justify-between py-2 text-sm">
                    <dt className="text-muted-foreground">{spec.label}</dt>
                    <dd className="font-medium text-foreground">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Customer Reviews</h2>
              <p className="text-sm text-muted-foreground">
                Reviews can only be posted from delivered Vendraza orders.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RatingStars rating={product.rating} size={16} showValue />
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          </div>
          {reviews.length === 0 ? (
            <p className="mt-4 rounded-lg bg-accent/30 p-4 text-sm text-muted-foreground">
              No verified reviews yet.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {reviews.map((review) => (
                <article key={review.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{review.customerName}</span>
                      {review.verifiedPurchase && (
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                          Verified purchase
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="mt-1">
                    <RatingStars rating={review.rating} size={13} />
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Related products */}
        {related && related.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-bold text-foreground">Related Products</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
              {related.map((p) => {
                const s = stores.find((st) => st.id === p.storeId);
                return (
                  <ProductCard
                    key={p.id}
                    product={p}
                    {...(s ? { storeName: s.name, storeSlug: s.slug } : {})}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
