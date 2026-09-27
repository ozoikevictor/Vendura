import { Link } from "@tanstack/react-router";
import { BadgeCheck, LockKeyhole, Mail, MapPin, ShieldCheck, Store } from "lucide-react";
import { categories } from "@/data/categories";
import { useAuthStore } from "@/store/auth";

export function SiteFooter() {
  const popularCats = categories.slice(0, 6);
  const isCustomer = useAuthStore((state) => state.user?.role === "customer");

  return (
    <footer className="mt-20 border-t border-white/10 bg-[#142019] text-white shadow-[0_-16px_40px_-32px_rgba(18,33,24,0.9)]">
      <div className="border-b border-white/10 bg-primary/15">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0 text-[#75d39b]" />
            <div>
              <p className="text-sm font-semibold">Protected checkout</p>
              <p className="text-xs text-white/60">Secure payment and order records</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-6 w-6 shrink-0 text-[#75d39b]" />
            <div>
              <p className="text-sm font-semibold">Seller transparency</p>
              <p className="text-xs text-white/60">Store profiles, ratings, and policies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-6 w-6 shrink-0 text-[#75d39b]" />
            <div>
              <p className="text-sm font-semibold">Account security</p>
              <p className="text-xs text-white/60">Protected access for buyers and sellers</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Vendraza
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/65">
              A Nigerian marketplace where customers discover independent stores and sellers manage
              products, orders, messages, and payouts.
            </p>
            <div className="mt-5 space-y-2 text-sm text-white/65">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#75d39b]" /> Lagos, Nigeria
              </p>
              <Link
                to="/contact"
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 text-[#75d39b]" /> Contact support
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white">Categories</h3>
            <ul className="mt-3 space-y-2">
              {popularCats.map((c) => (
                <li key={c.id}>
                  <Link
                    to="/categories/$slug"
                    params={{ slug: c.slug }}
                    className="text-sm text-white/65 transition-colors hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Shopping */}
          <div>
            <h3 className="text-sm font-semibold text-white">Shop</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/marketplace"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                <Link
                  to="/stores"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Stores
                </Link>
              </li>
              <li>
                <Link
                  to="/categories"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Categories
                </Link>
              </li>
              {isCustomer && (
                <li>
                  <Link
                    to="/customer/orders"
                    className="text-sm text-white/65 transition-colors hover:text-primary"
                  >
                    My orders
                  </Link>
                </li>
              )}
              {isCustomer && (
                <li>
                  <Link
                    to="/wishlist"
                    className="text-sm text-white/65 transition-colors hover:text-primary"
                  >
                    Wishlist
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Seller resources */}
          <div>
            <h3 className="text-sm font-semibold text-white">Sell</h3>
            <ul className="mt-3 space-y-2">
              {!isCustomer && (
                <li>
                  <Link
                    to="/vendor-register"
                    className="text-sm text-white/65 transition-colors hover:text-primary"
                  >
                    Become a seller
                  </Link>
                </li>
              )}
              {!isCustomer && (
                <li>
                  <Link
                    to="/login"
                    className="text-sm text-white/65 transition-colors hover:text-primary"
                  >
                    Seller login
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/help"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Seller help
                </Link>
              </li>
              <li>
                <Link
                  to="/vendor/subscription"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Seller plans
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Support</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/help"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Help center
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Contact us
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Returns and refunds
                </Link>
              </li>
              <li>
                <Link
                  to="/delivery-policy"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Delivery information
                </Link>
              </li>
              <li>
                <Link
                  to="/safety"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Safety center
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Terms of use
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link
                  to="/safety"
                  className="text-sm text-white/65 transition-colors hover:text-primary"
                >
                  Marketplace rules
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/50">© 2026 Vendraza. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-white/50 sm:justify-end">
            <span>Payments processed securely</span>
            <span aria-hidden="true">•</span>
            <span>Built for commerce in Nigeria</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
