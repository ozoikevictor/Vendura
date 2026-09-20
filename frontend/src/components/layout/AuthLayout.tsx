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
    <div className="flex min-h-screen flex-col bg-background">
      <header className={`sticky top-0 z-40 border-b border-[#cdbc9f] bg-[#eadcc4] transition-shadow duration-300 ${scrolled ? "shadow-[0_10px_28px_-16px_rgba(35,44,38,0.55)]" : "shadow-sm"}`}>
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

      <main className="flex-1">
        <div className="grid min-h-[calc(100vh-65px)] lg:grid-cols-[minmax(380px,0.9fr)_minmax(560px,1.1fr)]">
          <aside className="relative min-h-64 overflow-hidden lg:min-h-full">
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
          <section className="flex items-center justify-center px-4 py-10 sm:px-8 sm:py-14 lg:px-10">
            <div className="w-full animate-rise">{children}</div>
          </section>
        </div>
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
