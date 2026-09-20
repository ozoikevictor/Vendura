import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StorefrontState {
  activeStoreSlug: string | null;
  setActiveStore: (slug: string) => void;
  clearActiveStore: () => void;
}

export const useStorefrontStore = create<StorefrontState>()(
  persist(
    (set) => ({
      activeStoreSlug: null,
      setActiveStore: (activeStoreSlug) => set({ activeStoreSlug }),
      clearActiveStore: () => set({ activeStoreSlug: null }),
    }),
    { name: "vendura-active-storefront" },
  ),
);
