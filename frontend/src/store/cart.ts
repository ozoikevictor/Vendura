import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, ID, Product, ProductVariant } from "@/types";

interface CartState {
  items: CartItem[];
  add: (
    product: Product,
    variant: ProductVariant | null,
    quantity: number,
    negotiated?: { offerId: ID; agreedPrice: number },
  ) => void;
  addByProductId: (product: Product, quantity: number) => void;
  remove: (itemId: ID) => void;
  updateQty: (itemId: ID, quantity: number) => void;
  saveForLater: (itemId: ID, saved: boolean) => void;
  clear: () => void;
  getActiveItems: () => CartItem[];
  getSavedItems: () => CartItem[];
}

const variantId = (productId: ID, variant?: ID) =>
  variant ? `${productId}__${variant}` : productId;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      add: (product, variant, quantity, negotiated) => {
        const vid = variant ? variant.id : undefined;
        const id = variantId(product.id, vid);
        const unitPrice = variant?.price ?? product.price;
        const item: CartItem = {
          id,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.images[0] ?? "",
          availableStock: product.stock,
          ...(vid ? { variantId: vid } : {}),
          storeId: product.storeId,
          quantity,
          unitPrice: negotiated ? negotiated.agreedPrice : unitPrice,
          ...(negotiated
            ? { negotiated: { offerId: negotiated.offerId, agreedPrice: negotiated.agreedPrice } }
            : {}),
          addedAt: new Date().toISOString(),
        };
        set((state) => {
          const existing = state.items.find((i) => i.id === id && !i.savedForLater);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id && !i.savedForLater ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      addByProductId: (product, quantity) => {
        const id = variantId(product.id);
        const item: CartItem = {
          id,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.images[0] ?? "",
          availableStock: product.stock,
          storeId: product.storeId,
          quantity,
          unitPrice: product.price,
          addedAt: new Date().toISOString(),
        };
        set((state) => {
          const existing = state.items.find((i) => i.id === id && !i.savedForLater);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === id && !i.savedForLater ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      remove: (itemId) => set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

      updateQty: (itemId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i,
          ),
        })),

      saveForLater: (itemId, saved) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === itemId ? { ...i, savedForLater: saved } : i)),
        })),

      clear: () => set({ items: [] }),

      getActiveItems: () => get().items.filter((i) => !i.savedForLater),
      getSavedItems: () => get().items.filter((i) => i.savedForLater),
    }),
    { name: "vendura-cart" },
  ),
);
