import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Heart, LogOut, Mail, MessageSquare, Package, ShoppingBasket, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/store/auth";
import { logout } from "@/services/authService";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vendura" },
      { name: "description", content: "Manage your Vendura customer account." },
      { property: "og:title", content: "Profile — Vendura" },
      { property: "og:description", content: "Manage your Vendura customer account." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clear } = useAuthStore();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
      queryClient.clear();
      navigate({ to: "/login", replace: true });
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader publicMode />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <EmptyState
            title="Log in to view your profile"
            description="Your orders, wishlist, cart, messages, and account details stay under your customer profile."
            icon={<User className="h-8 w-8" />}
            action={<Link to="/login" className="text-sm font-semibold text-primary hover:underline">Log in</Link>}
          />
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
                {user.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{user.fullName}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileLink to="/customer/orders" icon={<Package className="h-5 w-5" />} title="Orders" description="Track purchases and delivery status." />
          <ProfileLink to="/messages" icon={<MessageSquare className="h-5 w-5" />} title="Messages" description="Continue conversations with sellers." />
          <ProfileLink to="/wishlist" icon={<Heart className="h-5 w-5" />} title="Wishlist" description="Return to products you saved." />
          <ProfileLink to="/cart" icon={<ShoppingBasket className="h-5 w-5" />} title="Cart" description="Review items before checkout." />
          <ProfileLink to="/stores" icon={<User className="h-5 w-5" />} title="Stores" description="Find vendors and storefronts." />
          <ProfileLink to="/marketplace" icon={<Package className="h-5 w-5" />} title="Marketplace" description="Shop products from all vendors." />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function ProfileLink({
  to,
  icon,
  title,
  description,
}: {
  to: NonNullable<React.ComponentProps<typeof Link>["to"]>;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-frost"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </div>
      <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
