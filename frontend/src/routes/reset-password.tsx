import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import * as authService from "@/services/authService";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import { AuthLayout } from "@/components/layout/AuthLayout";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({ token: typeof search["token"] === "string" ? search["token"] : "" }),
  head: () => ({
    meta: [
      { title: "Reset Password — Vendura" },
      { name: "description", content: "Set a new password for your Vendura account." },
      { property: "og:title", content: "Reset Password — Vendura" },
      { property: "og:description", content: "Set a new password for your Vendura account." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const token = search.token;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) { toast.error("Use at least 8 characters with an uppercase letter and a number"); return; }
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success("Password reset successfully");
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not reset password"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Choose a new password for your account.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">This reset link is missing or invalid. Request a new link from the forgot-password page.</p>}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">New password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="password" type={showPw ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-foreground">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="confirm" type={showPw ? "text" : "password"} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <button type="submit" disabled={loading || !token}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">
              {loading ? "Resetting..." : "Reset Password"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">Back to login</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
