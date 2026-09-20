import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import * as authService from "@/services/authService";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import { useStorefrontStore } from "@/store/storefront";
import { AuthLayout } from "@/components/layout/AuthLayout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log In — Vendura" },
      { name: "description", content: "Log in to your Vendura account to shop and manage orders." },
      { property: "og:title", content: "Log In — Vendura" },
      { property: "og:description", content: "Log in to your Vendura account." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.set);
  const hasCartItems = useCartStore((s) => s.items.some((item) => !item.savedForLater));
  const activeStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const user = await authService.login({ email, password });
      setAuth(user);
      toast.success("Welcome back!");
      if (user.role === "admin") navigate({ to: "/admin" });
      else if (user.role === "vendor") navigate({ to: "/vendor" });
      else if (hasCartItems) navigate({ to: "/checkout" });
      else if (activeStoreSlug) navigate({ to: "/store/$storeSlug", params: { storeSlug: activeStoreSlug } });
      else navigate({ to: "/marketplace" });
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Log in to shop or manage your store.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log In"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Want to sell?{" "}
          <Link to="/vendor-register" className="font-semibold text-primary hover:underline">
            Become a seller
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
