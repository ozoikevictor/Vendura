import { Apple } from "lucide-react";
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
        <span className="flex h-5 w-5 items-center justify-center font-bold text-base text-[#4285f4]">
          G
        </span>
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => notifyProviderSetup("Apple")}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
      >
        <Apple className="h-4 w-4 fill-current" />
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
