import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Store, Search, Heart, ShoppingBasket, Menu, User, Bell,
  Package, MessageSquare, LayoutGrid, ChevronDown, LogOut,
} from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useAuthStore } from "@/store/auth";
import { MobileDrawer } from "./MobileDrawer";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "@/services/notificationService";
import { logout } from "@/services/authService";
import { useQueryClient } from "@tanstack/react-query";
import { useStorefrontStore } from "@/store/storefront";

export function MarketplaceHeader({ publicMode = false }: { publicMode?: boolean }) {
  const setDrawerOpen = useUIStore((s) => s.setDrawerOpen);
  const cartCount = useCartStore((s) => s.getActiveItems().length);
  const wishlistCount = useWishlistStore((s) => s.ids.length);
  const { user, clear: clearAuth } = useAuthStore();
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const queryClient = useQueryClient();
  const activeStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: !publicMode && user?.role === "customer",
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
  });
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const storefrontSlug = publicMode ? null : activeStoreSlug;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate({ to: "/search", search: { q: searchValue.trim() } });
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      clearAuth();
      queryClient.clear();
      setAccountOpen(false);
      navigate({ to: "/login", replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 frost-strong border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link
            to={storefrontSlug ? "/store/$storeSlug" : "/"}
            params={storefrontSlug ? { storeSlug: storefrontSlug } : undefined}
            className="flex shrink-0 items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Vendura
            </span>
          </Link>

          {/* Search (desktop) */}
          <form onSubmit={handleSearch} className="hidden flex-1 max-w-xl md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Search products, stores, brands..."
                className="w-full rounded-lg border border-input bg-background/60 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </form>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              to="/marketplace"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LayoutGrid className="mr-1 inline h-4 w-4" />
              Marketplace
            </Link>
            <Link
              to="/categories"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Categories
            </Link>
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1">
            {publicMode ? <>
              <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                Log in
              </Link>
              <Link to="/vendor-register" className="hidden rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:inline-flex">
                Start selling
              </Link>
            </> : <>
            {/* Wishlist */}
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-clay-foreground">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              aria-label="Cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ShoppingBasket className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Orders */}
            <Link
              to="/customer/orders"
              aria-label="Orders"
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:flex"
            >
              <Package className="h-5 w-5" />
            </Link>

            {user?.role === "customer" && (
              <Link
                to="/customer/notifications"
                aria-label={`${unreadNotifications} unread notifications`}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-clay-foreground">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            {/* Messages */}
            <Link
              to="/messages"
              aria-label="Messages"
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:flex"
            >
              <MessageSquare className="h-5 w-5" />
            </Link>

            {/* Account */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {user?.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?"}
                </span>
                {user?.role === "customer" && (
                  <span className="hidden max-w-24 truncate sm:inline">{user.fullName}</span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-border bg-card p-1.5 shadow-frost z-50">
                  {user ? <><div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-sm font-semibold text-foreground">{user?.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    {user?.role === "customer" && (
                      <p className="mt-1 text-xs font-medium text-primary">Customer account</p>
                    )}
                  </div>
                  <MenuItem to="/customer/orders" icon={<Package className="h-4 w-4" />}>My Orders</MenuItem>
                  {user?.role === "customer" && <MenuItem to="/customer/notifications" icon={<Bell className="h-4 w-4" />}>Notifications</MenuItem>}
                  <MenuItem to="/messages" icon={<MessageSquare className="h-4 w-4" />}>Messages</MenuItem>
                  <MenuItem to="/wishlist" icon={<Heart className="h-4 w-4" />}>Wishlist</MenuItem>
                  {(user?.role === "vendor" || user?.role === "admin") && (
                    <MenuItem to="/vendor" icon={<Store className="h-4 w-4" />}>Vendor Dashboard</MenuItem>
                  )}
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? "Logging out..." : "Log out"}
                  </button>
                  </> : <>
                    <MenuItem to="/login" icon={<User className="h-4 w-4" />}>Log in</MenuItem>
                    <MenuItem to="/register" icon={<User className="h-4 w-4" />}>Create account</MenuItem>
                  </>}
                </div>
              )}
            </div>
            </>}
          </div>
        </div>

        {/* Search (mobile) */}
        <form onSubmit={handleSearch} className="border-t border-border px-4 py-2 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-input bg-background/60 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>
      </header>

      <MobileDrawer publicMode={publicMode} />
    </>
  );
}

function MenuItem({
  to,
  icon,
  children,
}: {
  to: NonNullable<React.ComponentProps<typeof Link>["to"]>;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
