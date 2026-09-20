import { Link } from "@tanstack/react-router";
import { Store, Menu } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { MobileDrawer } from "./MobileDrawer";

/**
 * Minimal header for the landing page and auth screens.
 */
export function PublicHeader() {
  const setDrawerOpen = useUIStore((s) => s.setDrawerOpen);

  return (
    <>
    <header className="sticky top-0 z-40 frost-strong border-b border-border">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Vendura
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/explore" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Marketplace
          </Link>
          <Link to="/explore" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Categories
          </Link>
          <Link to="/vendor-register" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Become a Seller
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
          >
            Log in
          </Link>
          <Link
            to="/vendor-register"
            className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:block"
          >
            Start Selling
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
    <MobileDrawer publicMode />
    </>
  );
}
