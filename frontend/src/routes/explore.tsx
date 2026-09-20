import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, UserPlus, ShoppingBag } from "lucide-react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Start Shopping - Vendura" },
      { name: "description", content: "Log in or create a customer account to explore Vendura." },
    ],
  }),
  component: ExploreAccessPage,
});

function ExploreAccessPage() {
  return (
    <div className="min-h-screen lagoon-wash">
      <PublicHeader />
      <main className="mx-auto flex min-h-[68vh] max-w-3xl items-center justify-center px-4 py-12 sm:px-6">
        <section className="w-full text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Customer account required
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            Log in or create a free customer account to browse the marketplace, explore categories, save products, and manage your orders.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
              <LogIn className="h-5 w-5" /> Log in
            </Link>
            <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground hover:bg-accent">
              <UserPlus className="h-5 w-5" /> Create account
            </Link>
          </div>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
            Return to Vendura home
          </Link>
        </section>
      </main>
      <SiteFooter publicMode />
    </div>
  );
}
