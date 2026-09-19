import { create } from "zustand";
import type { ID } from "@/types";

interface WishlistState {
  ids: ID[];
  toggle: (productId: ID) => void;
  has: (productId: ID) => boolean;
  remove: (productId: ID) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  toggle: (productId) =>
    set((state) => ({
      ids: state.ids.includes(productId)
        ? state.ids.filter((id) => id !== productId)
        : [...state.ids, productId],
    })),
  has: (productId) => get().ids.includes(productId),
  remove: (productId) =>
    set((state) => ({ ids: state.ids.filter((id) => id !== productId) })),
  clear: () => set({ ids: [] }),
}));
