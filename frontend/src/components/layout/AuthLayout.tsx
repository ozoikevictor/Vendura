import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck, Store } from "lucide-react";
import authBanner from "@/assets/hero-marketplace.jpg";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <header className={`sticky inset-x-0 top-0 z-50 shrink-0 border-b border-primary/20 bg-[#edf8f0] transition-shadow duration-300 ${scrolled ? "shadow-[0_10px_28px_-16px_rgba(35,44,38,0.45)]" : "shadow-sm"}`}>
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2 text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </span>
            <span className="truncate font-display text-xl font-bold">Vendura</span>
          </Link>
          <Link to="/" className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-foreground sm:gap-2 sm:text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="min-h-[calc(100svh-4rem)] lg:relative">
          <aside className="relative min-h-64 overflow-hidden lg:fixed lg:bottom-0 lg:left-0 lg:top-16 lg:w-[44%] lg:min-h-0">
            <img src={authBanner} alt="A Vendura seller preparing products for customers" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-foreground/70" />
            <div className="relative flex h-full min-h-64 flex-col justify-end px-6 py-8 text-white sm:px-10 lg:px-12 lg:py-14">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/75">Your business, online</p>
              <h2 className="mt-3 max-w-lg font-display text-3xl font-bold sm:text-4xl">Build trust. Share your store. Sell with confidence.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/80 sm:text-base">
                Vendura gives Nigerian businesses one place to manage products, receive orders, and serve customers through a shareable storefront.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#b7e3c4]" /> Secure payments</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#b7e3c4]" /> Easy store management</span>
              </div>
            </div>
          </aside>
          <section className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-10 sm:px-8 sm:py-14 lg:ml-[44%] lg:px-10">
            <div className="w-full animate-rise">{children}</div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-card lg:ml-[44%]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <span>© 2026 Vendura. Secure shopping and selling across Nigeria.</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            Privacy protected · Secure payments · Help
          </span>
        </div>
      </footer>
    </div>
  );
}
