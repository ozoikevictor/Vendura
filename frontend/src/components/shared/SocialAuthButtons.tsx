import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import * as authService from "@/services/authService";
import { getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";

const GOOGLE_SCRIPT = "google-identity-script";
const APPLE_SCRIPT = "apple-auth-script";
const googleClientId = import.meta.env["VITE_GOOGLE_CLIENT_ID"] || "";
const appleClientId = import.meta.env["VITE_APPLE_CLIENT_ID"] || "";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (options: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const current = document.getElementById(id) as HTMLScriptElement | null;
    if (current) {
      if (current.dataset.loaded === "true") resolve();
      else current.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Could not load the sign-in provider"));
    document.head.appendChild(script);
  });
}

export function SocialAuthButtons({ showDivider = true }: { showDivider?: boolean }) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.set);
  const hasCartItems = useCartStore((state) => state.items.some((item) => !item.savedForLater));
  const googleButton = useRef<HTMLDivElement>(null);
  const [appleLoading, setAppleLoading] = useState(false);

  const finishLogin = useCallback(
    (user: Awaited<ReturnType<typeof authService.socialLogin>>) => {
      setAuth(user);
      toast.success("Welcome to Vendraza!");
      if (user.role === "admin") navigate({ to: "/admin" });
      else if (user.role === "vendor") navigate({ to: "/vendor" });
      else if (hasCartItems) navigate({ to: "/checkout" });
      else navigate({ to: "/marketplace" });
    },
    [hasCartItems, navigate, setAuth],
  );

  useEffect(() => {
    if (!googleClientId || !googleButton.current) return;
    let active = true;
    loadScript(GOOGLE_SCRIPT, "https://accounts.google.com/gsi/client")
      .then(() => {
        if (!active || !window.google || !googleButton.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }: { credential: string }) => {
            try {
              finishLogin(
                await authService.socialLogin({ provider: "google", identityToken: credential }),
              );
            } catch (error) {
              toast.error(getErrorMessage(error, "Google sign-in failed"));
            }
          },
        });
        googleButton.current.replaceChildren();
        window.google.accounts.id.renderButton(googleButton.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
          width: googleButton.current.clientWidth,
        });
      })
      .catch((error) => toast.error(getErrorMessage(error, "Google sign-in is unavailable")));
    return () => {
      active = false;
    };
  }, [finishLogin]);

  const signInWithApple = async () => {
    if (!appleClientId) return toast.error("Apple sign-in is not configured yet");
    setAppleLoading(true);
    try {
      await loadScript(
        APPLE_SCRIPT,
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
      );
      if (!window.AppleID) throw new Error("Apple sign-in could not start");
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: "name email",
        redirectURI: `${window.location.origin}/login`,
        usePopup: true,
      });
      const result = await window.AppleID.auth.signIn();
      const name = [result.user?.name?.firstName, result.user?.name?.lastName]
        .filter(Boolean)
        .join(" ");
      finishLogin(
        await authService.socialLogin({
          provider: "apple",
          identityToken: result.authorization.id_token,
          ...(name ? { fullName: name } : {}),
        }),
      );
    } catch (error) {
      if ((error as { error?: string })?.error !== "popup_closed_by_user")
        toast.error(getErrorMessage(error, "Apple sign-in failed"));
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {googleClientId ? (
        <div
          ref={googleButton}
          className="flex min-h-11 w-full items-center justify-center overflow-hidden [&>div]:w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => toast.error("Google sign-in is not configured yet")}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      )}
      <button
        type="button"
        onClick={signInWithApple}
        disabled={appleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
      >
        {appleLoading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <AppleIcon />}
        {appleLoading ? "Connecting..." : "Continue with Apple"}
      </button>
      {showDivider && (
        <div className="flex items-center gap-3 py-1" aria-hidden="true">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Or continue with email
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.23a4.47 4.47 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.92-4.18 2.92-7.26Z"
      />
      <path
        fill="#34A853"
        d="M12 21.92c2.63 0 4.84-.87 6.45-2.39l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.92Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.98A5.86 5.86 0 0 1 6.23 12c0-.69.12-1.36.31-1.98V7.49H3.3A9.93 9.93 0 0 0 2.25 12c0 1.62.39 3.15 1.05 4.51l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.99c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.08 14.63 2.08 12 2.08a9.74 9.74 0 0 0-8.7 5.41l3.24 2.53C7.31 7.71 9.46 5.99 12 5.99Z"
      />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
      <path d="M17.05 12.54c-.02-2.35 1.92-3.49 2.01-3.55a4.33 4.33 0 0 0-3.41-1.84c-1.44-.15-2.82.86-3.55.86-.74 0-1.88-.84-3.09-.82a4.56 4.56 0 0 0-3.83 2.34c-1.65 2.86-.42 7.06 1.17 9.37.8 1.13 1.72 2.39 2.95 2.34 1.19-.05 1.64-.76 3.08-.76 1.44 0 1.84.76 3.1.73 1.28-.02 2.08-1.14 2.85-2.28a9.35 9.35 0 0 0 1.3-2.64 4.1 4.1 0 0 1-2.58-3.75ZM14.72 5.63a4.16 4.16 0 0 0 .95-3.02 4.24 4.24 0 0 0-2.74 1.42 3.97 3.97 0 0 0-.98 2.9 3.5 3.5 0 0 0 2.77-1.3Z" />
    </svg>
  );
}
