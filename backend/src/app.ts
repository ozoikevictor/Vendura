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
import type { AuthRequest } from "./types.js";

export function createApp(db: Database) {
  const app = express();
  const configuredOrigins = config.FRONTEND_URL.split(",").map((origin) =>
    origin.trim(),
  );
  const isAllowedOrigin = (origin?: string) =>
    !origin ||
    configuredOrigins.includes(origin) ||
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
  app.use("/api", planRoutes(db));
  app.use("/api/vendor", vendorRoutes(db));
  app.use("/api/admin", adminRoutes(db));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
