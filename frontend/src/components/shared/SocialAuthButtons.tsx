import { toast } from "sonner";

export function SocialAuthButtons() {
  const notifyProviderSetup = (provider: string) => {
    toast.info(`${provider} sign-in will be available after OAuth setup.`);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => notifyProviderSetup("Google")}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => notifyProviderSetup("Apple")}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
      >
        <AppleIcon />
        Continue with Apple
      </button>
      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Or continue with email
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
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
