import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  JWT_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:8080"),
  PAYSTACK_SECRET_KEY: z.string().startsWith("sk_").optional(),
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  DELIVERY_CONFIRMATION_WINDOW_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  HIGH_VALUE_REVIEW_THRESHOLD_NGN: z.coerce.number().positive().default(500000),
  EMAIL_FROM: z.string().default("Vendura <onboarding@resend.dev>"),
  REQUIRE_EMAIL_VERIFICATION: z.string().default("false").transform((value) => value.toLowerCase() === "true")
});

export const config = schema.parse(process.env);
