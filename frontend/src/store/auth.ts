import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserRole } from "@/types";
import { clearToken } from "@/services/api";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  set: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      set: (user) => set({ user, role: user.role }),
      clear: () => {
        clearToken();
        set({ user: null, role: null });
      },
    }),
    { name: "vendura-auth" },
  ),
);
