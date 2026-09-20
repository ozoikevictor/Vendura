import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Store } from "lucide-react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold">Vendura</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full animate-rise">{children}</div>
      </main>

      <footer className="border-t border-border bg-card/75">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <span>© 2026 Vendura. Secure shopping and selling across Nigeria.</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Privacy protected · Secure payments · Help when you need it
          </span>
        </div>
      </footer>
    </div>
  );
}
