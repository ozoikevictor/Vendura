import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Store, X, Home, LayoutGrid, Heart, ShoppingBasket,
  Package, MessageSquare, User, LogIn, Store as StoreIcon, Bell, LogOut,
} from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { categories } from "@/data/categories";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { logout } from "@/services/authService";
import { useQueryClient } from "@tanstack/react-query";
import { useStorefrontStore } from "@/store/storefront";

/**
 * Mobile navigation drawer.
 *
 * Requirements:
 *  - Opens/closes smoothly (CSS transitions)
 *  - Close icon (X) visible
 *  - Scrolls internally
 *  - Never freezes the page (body scroll lock is cleaned up on unmount)
 *  - No invisible overlay (pointer-events-none when closed)
 */
export function MobileDrawer({ publicMode = false }: { publicMode?: boolean }) {
  const { drawerOpen, setDrawerOpen } = useUIStore();
  const cartCount = useCartStore((s) => s.getActiveItems().length);
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clear);
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const rememberedStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);
  const activeStoreSlug = publicMode ? null : rememberedStoreSlug;
  const isCustomer = user?.role === "customer";
  const isSellerPreview = user?.role === "vendor" || user?.role === "admin";

  // Scroll lock with guaranteed cleanup — never freezes the page
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Escape to close
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen, setDrawerOpen]);

  const close = () => setDrawerOpen(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    close();
    navigate({ to: "/search", search: { q: searchValue } });
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      clearAuth();
      queryClient.clear();
      close();
      navigate({ to: "/login", replace: true });
      setLoggingOut(false);
    }
  };

  const handleCustomerLogin = async () => {
    if (isSellerPreview) {
      await handleLogout();
      return;
    }
    close();
    navigate({ to: "/login" });
  };

  const handleCustomerRegistration = async () => {
    if (isSellerPreview) {
      setLoggingOut(true);
      try {
        await logout();
      } finally {
        clearAuth();
        queryClient.clear();
        close();
        navigate({ to: "/register", replace: true });
        setLoggingOut(false);
      }
      return;
    }
    close();
    navigate({ to: "/register" });
  };

  return (
    <>
      {/* Backdrop — pointer-events-none when closed so there's no invisible overlay */}
      <div
        onClick={close}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300",
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col bg-card shadow-frost transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!drawerOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link to={activeStoreSlug ? "/store/$storeSlug" : "/"} params={activeStoreSlug ? { storeSlug: activeStoreSlug } : undefined} onClick={close} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              Vendura
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-4">
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>

          {/* Quick links */}
          <nav className="space-y-1">
            {activeStoreSlug ? (
              <Link to="/store/$storeSlug" params={{ storeSlug: activeStoreSlug }} onClick={close} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <Home className="h-4 w-4" /> Store Home
              </Link>
            ) : (
              <DrawerLink to="/" onClick={close} icon={<Home className="h-4 w-4" />}>Home</DrawerLink>
            )}
            {activeStoreSlug ? <>
              <Link to="/store/$storeSlug" params={{ storeSlug: activeStoreSlug }} hash="store-products" onClick={close} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <LayoutGrid className="h-4 w-4" /> Marketplace
              </Link>
              <Link to="/categories" onClick={close} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <Package className="h-4 w-4" /> Categories
              </Link>
            </> : <>
              <DrawerLink to={publicMode ? "/explore" : "/marketplace"} onClick={close} icon={<LayoutGrid className="h-4 w-4" />}>Marketplace</DrawerLink>
              <DrawerLink to={publicMode ? "/explore" : "/categories"} onClick={close} icon={<Package className="h-4 w-4" />}>Categories</DrawerLink>
            </>}
            {!publicMode && <>
              <DrawerLink to="/cart" onClick={close} icon={<ShoppingBasket className="h-4 w-4" />} badge={cartCount}>
                Cart
              </DrawerLink>
              <DrawerLink to="/wishlist" onClick={close} icon={<Heart className="h-4 w-4" />} badge={wishlistCount}>
                Wishlist
              </DrawerLink>
              {isCustomer && <DrawerLink to="/customer/orders" onClick={close} icon={<Package className="h-4 w-4" />}>
                  My Orders
                </DrawerLink>}
              {user?.role === "customer" && <DrawerLink to="/customer/notifications" onClick={close} icon={<Bell className="h-4 w-4" />}>Notifications</DrawerLink>}
              {isCustomer && <DrawerLink to="/messages" onClick={close} icon={<MessageSquare className="h-4 w-4" />}>
                  Messages
                </DrawerLink>}
            </>}
          </nav>

          {/* Categories */}
          {!publicMode && <div className="mt-6">
            <p className="eyebrow mb-2">Categories</p>
            <div className="space-y-0.5">
              {categories.slice(0, 12).map((c) => (
                <Link
                  key={c.id}
                  to="/categories/$slug"
                  params={{ slug: c.slug }}
                  onClick={close}
                  className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {c.name}
                </Link>
              ))}
              <Link
                to="/categories"
                onClick={close}
                className="block rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
              >
                View all →
              </Link>
            </div>
          </div>}

          {/* Account */}
          <div className="mt-6 border-t border-border pt-4">
            <p className="eyebrow mb-2">Account</p>
            <div className="space-y-1">
              {publicMode ? <>
                <DrawerLink to="/login" onClick={close} icon={<LogIn className="h-4 w-4" />}>Log in</DrawerLink>
                <DrawerLink to="/register" onClick={close} icon={<User className="h-4 w-4" />}>Create customer account</DrawerLink>
                <DrawerLink to="/vendor-register" onClick={close} icon={<StoreIcon className="h-4 w-4" />}>Start selling</DrawerLink>
              </> : isCustomer ? <>
                <div className="mb-2 rounded-lg bg-accent/50 px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">Customer account</p>
                </div>
                <DrawerLink to="/customer/orders" onClick={close} icon={<User className="h-4 w-4" />}>Customer Account</DrawerLink>
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive-soft disabled:opacity-60"><LogOut className="h-4 w-4" />{loggingOut ? "Logging out..." : "Log out"}</button>
              </> : isSellerPreview ? <>
                <div className="mb-2 rounded-lg bg-accent/50 px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">Storefront preview</p>
                  <p className="text-xs text-muted-foreground">Customers use their own account here.</p>
                </div>
                <DrawerLink to="/vendor" onClick={close} icon={<StoreIcon className="h-4 w-4" />}>Vendor Dashboard</DrawerLink>
                <button type="button" onClick={handleCustomerLogin} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"><LogIn className="h-4 w-4" />{loggingOut ? "Switching..." : "Customer login"}</button>
                <button type="button" onClick={handleCustomerRegistration} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"><User className="h-4 w-4" />Create customer account</button>
              </> : <>
                <button type="button" onClick={handleCustomerLogin} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"><LogIn className="h-4 w-4" />Customer login</button>
                <DrawerLink to="/login" onClick={close} icon={<StoreIcon className="h-4 w-4" />}>Vendor login</DrawerLink>
                <DrawerLink to="/register" onClick={close} icon={<User className="h-4 w-4" />}>Create customer account</DrawerLink>
                <DrawerLink to="/vendor-register" onClick={close} icon={<StoreIcon className="h-4 w-4" />}>Create seller account</DrawerLink>
              </>}
              {user?.role === "customer" && <DrawerLink to="/vendor-register" onClick={close} icon={<StoreIcon className="h-4 w-4" />}>Become a Seller</DrawerLink>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function DrawerLink({
  to,
  onClick,
  icon,
  badge,
  children,
}: {
  to: NonNullable<React.ComponentProps<typeof Link>["to"]>;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
    >
      {icon}
      {children}
      {badge != null && badge > 0 && (
        <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
