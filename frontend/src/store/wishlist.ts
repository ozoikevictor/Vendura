import { create } from "zustand";
import type { ID } from "@/types";

interface WishlistState {
  ids: ID[];
  setIds: (ids: ID[]) => void;
  add: (productId: ID) => void;
  toggle: (productId: ID) => void;
  has: (productId: ID) => boolean;
  remove: (productId: ID) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: [],
  setIds: (ids) => set({ ids: Array.from(new Set(ids)) }),
  add: (productId) =>
    set((state) => ({
      ids: state.ids.includes(productId) ? state.ids : [...state.ids, productId],
    })),
  toggle: (productId) =>
    set((state) => ({
      ids: state.ids.includes(productId)
        ? state.ids.filter((id) => id !== productId)
        : [...state.ids, productId],
    })),
  has: (productId) => get().ids.includes(productId),
  remove: (productId) => set((state) => ({ ids: state.ids.filter((id) => id !== productId) })),
  clear: () => set({ ids: [] }),
}));
