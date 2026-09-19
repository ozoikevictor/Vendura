import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { CheckCircle2, ArrowRight, RotateCw } from "lucide-react";
import * as authService from "@/services/authService";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify Email — Vendura" },
      {
        name: "description",
        content: "Verify your email address to activate your Vendura account.",
      },
      { property: "og:title", content: "Verify Email — Vendura" },
      { property: "og:description", content: "Verify your email address." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.set);
  const hasCartItems = useCartStore((s) => s.items.some((item) => !item.savedForLater));
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleOtpChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setError("");
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter all six digits from your verification code.");
      return;
    }
    setLoading(true);
    try {
      const { verified } = await authService.verifyEmail(code);
      if (verified) {
        if (user) setAuth({ ...user, emailVerified: true });
        setVerified(true);
        toast.success("Email verified!");
        setTimeout(() => {
          if (user?.role === "vendor") {
            navigate({ to: "/vendor" });
          } else {
            navigate({ to: hasCartItems ? "/checkout" : "/marketplace" });
          }
        }, 1500);
      } else {
        setError("That verification code is incorrect. Check the code and try again.");
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Verification failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await authService.resendOtp();
      setError("");
      toast.success("New code sent");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Could not resend code"));
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <div className="flex min-h-screen items-center justify-center lagoon-wash px-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Email Verified!</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Redirecting you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center lagoon-wash px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="font-display text-2xl font-bold text-primary">
            Vendura
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Verify your email</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Enter the 6-digit code sent to{" "}
            <span className="font-medium text-foreground">{user?.email ?? "your email"}</span>.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  aria-label={`Digit ${i + 1}`}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "verification-error" : undefined}
                  className={`h-12 w-12 rounded-lg border bg-background text-center text-lg font-semibold text-foreground outline-none transition-colors focus:ring-1 ${error ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                />
              ))}
            </div>

            {error && (
              <p
                id="verification-error"
                role="alert"
                className="text-center text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify Email"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Didn't get the code?</p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
            >
              <RotateCw className="h-3.5 w-3.5" />
              {resending ? "Sending..." : "Resend code"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
