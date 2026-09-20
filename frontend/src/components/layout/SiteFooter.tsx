import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { categories } from "@/data/categories";

export function SiteFooter({ publicMode = false }: { publicMode?: boolean }) {
  const popularCats = categories.slice(0, 6);
  const popularStores = [
    { name: "TechNaija", slug: "technaija" },
    { name: "Ada Fashion", slug: "ada-fashion" },
    { name: "HomeKraft", slug: "homekraft" },
    { name: "Stride Lagos", slug: "stride-lagos" },
    { name: "Essence Co.", slug: "essence-co" },
  ];

  return (
    <footer className="border-t border-border bg-card mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Vendura
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Nigeria's multi-vendor marketplace. Sell smarter, shop anywhere —
              from phones to fashion, building materials to baby products.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                aria-label="Twitter"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-primary"
              >
                𝕏
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-primary"
              >
                ◎
              </a>
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-primary"
              >
                f
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-foreground text-sm">Categories</h3>
            <ul className="mt-3 space-y-2">
              {popularCats.map((c) => (
                <li key={c.id}>
                  <Link
                    to={publicMode ? "/explore" : "/categories/$slug"}
                    params={publicMode ? undefined : { slug: c.slug }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stores */}
          <div>
            <h3 className="font-semibold text-foreground text-sm">Top Stores</h3>
            <ul className="mt-3 space-y-2">
              {popularStores.map((s) => (
                <li key={s.slug}>
                  <Link
                    to={publicMode ? "/explore" : "/store/$storeSlug"}
                    params={publicMode ? undefined : { storeSlug: s.slug }}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-foreground text-sm">Company</h3>
            <ul className="mt-3 space-y-2">
              <li><Link to="/vendor-register" className="text-sm text-muted-foreground hover:text-primary">Become a Seller</Link></li>
              <li><Link to={publicMode ? "/explore" : "/marketplace"} className="text-sm text-muted-foreground hover:text-primary">Marketplace</Link></li>
              <li><Link to={publicMode ? "/explore" : "/categories"} className="text-sm text-muted-foreground hover:text-primary">All Categories</Link></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Help Center</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2026 Vendura. Made in Lagos, Nigeria.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
