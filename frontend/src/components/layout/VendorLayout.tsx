import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Store,
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingBag,
  MessageSquare,
  Users,
  Boxes,
  BarChart3,
  Wallet,
  CreditCard,
  Truck,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
} from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { getVendorStore } from "@/services/storeService";
import { getNotifications } from "@/services/notificationService";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/vendor", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/vendor/products", label: "Products", icon: Package },
  { to: "/vendor/products/new", label: "Add Product", icon: PlusCircle },
  { to: "/vendor/orders", label: "Orders", icon: ShoppingBag },
  { to: "/vendor/messages", label: "Messages", icon: MessageSquare },
  { to: "/vendor/customers", label: "Customers", icon: Users },
  { to: "/vendor/inventory", label: "Inventory", icon: Boxes },
  { to: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/vendor/payouts", label: "Payouts", icon: Wallet },
  { to: "/vendor/subscription", label: "Subscription", icon: CreditCard },
  { to: "/vendor/delivery", label: "Delivery", icon: Truck },
  { to: "/vendor/notifications", label: "Notifications", icon: Bell },
  { to: "/vendor/settings", label: "Settings", icon: Settings },
] as const;

export function VendorLayout() {
  const { vendorSidebarOpen, setVendorSidebarOpen } = useUIStore();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [searchValue, setSearchValue] = useState("");
  const [authHydrated, setAuthHydrated] = useState(useAuthStore.persist.hasHydrated());
  const user = useAuthStore((state) => state.user);
  const { data: store } = useQuery({
    queryKey: ["vendor-store", user?.storeId],
    queryFn: () => getVendorStore(user?.id ?? ""),
    enabled: Boolean(user?.storeId),
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: Boolean(user),
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
  });
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const initials = (user?.fullName ?? "Vendor")
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
  }, []);

  useEffect(() => {
    if (!authHydrated) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
    } else if (user.role !== "vendor" && user.role !== "admin") {
      navigate({ to: "/marketplace", replace: true });
    }
  }, [authHydrated, navigate, user]);

  // Scroll lock for mobile sidebar
  useEffect(() => {
    if (!vendorSidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [vendorSidebarOpen]);

  // Escape to close
  useEffect(() => {
    if (!vendorSidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVendorSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [vendorSidebarOpen, setVendorSidebarOpen]);

  if (!authHydrated || !user || (user.role !== "vendor" && user.role !== "admin")) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <VendorSidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      <div
        onClick={() => setVendorSidebarOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          vendorSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col bg-sidebar shadow-frost transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden",
          vendorSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!vendorSidebarOpen}
      >
        <VendorSidebar onNavigate={() => setVendorSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setVendorSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden flex-1 max-w-md sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search products, orders..."
              className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/vendor/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-clay-foreground">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Link>
            <Link
              to={store ? "/store/$storeSlug" : "/vendor"}
              params={store ? { storeSlug: store.slug } : undefined}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Storefront</span>
            </Link>
            <div className="flex items-center gap-2 rounded-lg px-2 py-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-foreground">
                  {user?.fullName ?? "Vendor"}
                </p>
                <p className="text-xs text-muted-foreground">{store?.name ?? "Your store"}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function VendorSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const clearAuth = useAuthStore((state) => state.clear);

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
        <Link to="/vendor" onClick={onNavigate} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <span className="font-display text-base font-bold tracking-tight text-sidebar-foreground">
              Vendura
            </span>
            <p className="text-xs text-muted-foreground">Vendor Panel</p>
          </div>
        </Link>
        {onNavigate && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onNavigate}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-accent lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-none px-2 py-3">
        {navItems.map((item) => {
          const active =
            "end" in item && item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive-soft hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
