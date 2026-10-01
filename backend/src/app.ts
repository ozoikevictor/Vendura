import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { config } from "./config.js";
import type { Database } from "./types.js";
import { errorHandler, notFound } from "./lib/errors.js";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { userRoutes } from "./routes/users.js";
import { orderRoutes } from "./routes/orders.js";
import { messageRoutes } from "./routes/messages.js";
import { notificationRoutes } from "./routes/notifications.js";
import { planRoutes, vendorRoutes } from "./routes/vendor.js";
import { paymentRoutes } from "./routes/payments.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { adminRoutes } from "./routes/admin.js";
import { aiRoutes } from "./routes/ai.js";
import { supportRoutes } from "./routes/support.js";
import { uploadRoutes } from "./routes/uploads.js";
import type { AuthRequest, Entity } from "./types.js";

export function createApp(db: Database) {
  const app = express();
  const configuredOrigins = new Set([
    ...config.FRONTEND_URL.split(",").map((origin) => origin.trim()),
    "https://vendraza.com",
    "https://www.vendraza.com",
  ]);
  const isAllowedOrigin = (origin?: string) =>
    !origin ||
    configuredOrigins.has(origin) ||
    (config.NODE_ENV === "development" &&
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    }),
  );
  app.use(
    express.json({
      limit: "8mb",
      verify: (req, _res, buffer) => {
        (req as AuthRequest).rawBody = buffer;
      },
    }),
  );
  if (config.NODE_ENV !== "test") {
    app.use(
      "/api",
      rateLimit({
        windowMs: 15 * 60_000,
        limit: 3000,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
          error: {
            message:
              "The app is receiving unusually high traffic. Please wait a moment and try again.",
          },
        },
      }),
    );
    app.use(
      "/api/auth/login",
      rateLimit({
        windowMs: 15 * 60_000,
        limit: 20,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        message: {
          error: {
            message:
              "Too many login attempts. Please wait 15 minutes and try again.",
          },
        },
      }),
    );
  }
  app.get("/health", (_req, res) =>
    res.json({ status: "ok", service: "vendura-api" }),
  );
  app.get("/sitemap.xml", async (_req, res, next) => {
    try {
      const sitemap = await buildSitemap(db);
      res
        .type("application/xml")
        .set("Cache-Control", "public, max-age=300, s-maxage=3600")
        .send(sitemap);
    } catch (error) {
      next(error);
    }
  });
  app.use("/api", webhookRoutes(db));
  app.use("/api/auth", authRoutes(db));
  app.use("/api/users", userRoutes(db));
  app.use("/api", catalogRoutes(db));
  app.use("/api", orderRoutes(db));
  app.use("/api", paymentRoutes(db));
  app.use("/api", messageRoutes(db));
  app.use("/api", notificationRoutes(db));
  app.use("/api", aiRoutes(db));
  app.use("/api/support", supportRoutes(db));
  app.use("/api/uploads", uploadRoutes());
  app.use("/api", planRoutes(db));
  app.use("/api/vendor", vendorRoutes(db));
  app.use("/api/admin", adminRoutes(db));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

type SitemapUrl = {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
};

const SITE_URL = "https://vendraza.com";

async function buildSitemap(db: Database) {
  const now = new Date().toISOString();
  const [products, stores, categories] = await Promise.all([
    db.list<Entity>("products"),
    db.list<Entity>("stores"),
    db.list<Entity>("categories"),
  ]);
  const liveProducts = products.filter(
    (product) => product.status === "active" && Number(product.stock) > 0,
  );
  const productCounts = new Map<string, number>();
  for (const product of liveProducts) {
    const storeId = String(product.storeId ?? "");
    productCounts.set(storeId, (productCounts.get(storeId) ?? 0) + 1);
  }
  const urls: SitemapUrl[] = [
    { loc: "/", lastmod: now, changefreq: "daily", priority: "1.0" },
    { loc: "/marketplace", lastmod: now, changefreq: "daily", priority: "0.9" },
    { loc: "/categories", lastmod: now, changefreq: "weekly", priority: "0.8" },
    { loc: "/stores", lastmod: now, changefreq: "daily", priority: "0.8" },
    { loc: "/vendor-register", lastmod: now, changefreq: "monthly", priority: "0.7" },
    { loc: "/help", lastmod: now, changefreq: "monthly", priority: "0.5" },
    { loc: "/contact", lastmod: now, changefreq: "monthly", priority: "0.5" },
    { loc: "/safety", lastmod: now, changefreq: "monthly", priority: "0.4" },
    { loc: "/terms", lastmod: now, changefreq: "yearly", priority: "0.3" },
    { loc: "/privacy", lastmod: now, changefreq: "yearly", priority: "0.3" },
    { loc: "/returns", lastmod: now, changefreq: "yearly", priority: "0.3" },
    { loc: "/delivery-policy", lastmod: now, changefreq: "yearly", priority: "0.3" },
    ...categories
      .filter((category) => typeof category.slug === "string")
      .map((category) => ({
        loc: `/categories/${category.slug}`,
        lastmod: now,
        changefreq: "weekly",
        priority: "0.7",
      })),
    ...stores
      .filter((store) => typeof store.slug === "string" && productCounts.has(String(store.id)))
      .map((store) => ({
        loc: `/store/${store.slug}`,
        lastmod: String(store.updatedAt ?? store.joinedAt ?? now),
        changefreq: "daily",
        priority: "0.7",
      })),
    ...liveProducts
      .filter((product) => typeof product.slug === "string")
      .map((product) => ({
        loc: `/product/${product.slug}`,
        lastmod: String(product.updatedAt ?? product.createdAt ?? now),
        changefreq: "daily",
        priority: "0.8",
      })),
  ];

  return renderSitemap(urls);
}

function renderSitemap(urls: SitemapUrl[]) {
  const uniqueUrls = new Map(urls.map((url) => [url.loc, url]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...uniqueUrls.values()]
  .map(
    (url) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${url.loc}`)}</loc>
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
