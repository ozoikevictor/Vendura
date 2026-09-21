import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { categories } from "@/data/categories";

export function SiteFooter() {
  const popularCats = categories.slice(0, 6);

  return (
    <footer className="mt-20 border-t-4 border-primary/30 bg-[#17211b] text-white shadow-[0_-16px_40px_-32px_rgba(18,33,24,0.9)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Vendura
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/65">
              Nigeria's multi-vendor marketplace. Sell smarter, shop anywhere —
              from phones to fashion, building materials to baby products.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                aria-label="Twitter"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/65 transition-colors hover:border-primary/60 hover:text-primary"
              >
                𝕏
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/65 transition-colors hover:border-primary/60 hover:text-primary"
              >
                ◎
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-white/65 transition-colors hover:border-primary/60 hover:text-primary"
              >
                f
              </a>
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

          {/* Seller resources */}
          <div>
            <h3 className="text-sm font-semibold text-white">For Sellers</h3>
            <ul className="mt-3 space-y-2">
              <li><Link to="/vendor-register" className="text-sm text-white/65 transition-colors hover:text-primary">Start selling</Link></li>
              <li><Link to="/login" className="text-sm text-white/65 transition-colors hover:text-primary">Seller login</Link></li>
              <li><Link to="/vendor-register" className="text-sm text-white/65 transition-colors hover:text-primary">Open a store</Link></li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white">Company</h3>
            <ul className="mt-3 space-y-2">
              <li><Link to="/vendor-register" className="text-sm text-white/65 transition-colors hover:text-primary">Become a Seller</Link></li>
              <li><Link to="/marketplace" className="text-sm text-white/65 transition-colors hover:text-primary">Marketplace</Link></li>
              <li><Link to="/categories" className="text-sm text-white/65 transition-colors hover:text-primary">All Categories</Link></li>
              <li><a href="#" className="text-sm text-white/65 transition-colors hover:text-primary">Help Center</a></li>
              <li><a href="#" className="text-sm text-white/65 transition-colors hover:text-primary">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/50">
            © 2026 Vendura. Made in Lagos, Nigeria.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span>Paystack</span>
            <span>·</span>
            <span>Flutterwave</span>
            <span>·</span>
            <span>Bank Transfer</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
