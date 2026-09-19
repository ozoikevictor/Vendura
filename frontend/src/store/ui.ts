import { create } from "zustand";

interface UIState {
  /** Mobile navigation drawer for public/marketplace headers */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Vendor sidebar mobile state */
  vendorSidebarOpen: boolean;
  setVendorSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  vendorSidebarOpen: false,
  setVendorSidebarOpen: (vendorSidebarOpen) => set({ vendorSidebarOpen }),
}));
