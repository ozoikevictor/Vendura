import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../lib/errors.js";
import { created, id, now } from "../lib/helpers.js";
import { verifyHuman } from "../lib/turnstile.js";
import type { Database } from "../types.js";

const requestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  category: z.enum([
    "order",
    "payment",
    "vendor",
    "account",
    "technical",
    "safety",
    "other",
  ]),
  subject: z.string().trim().min(3).max(150),
  message: z.string().trim().min(10).max(3000),
  captchaToken: z.string().min(1, "Complete the security check").optional(),
});

export const supportRoutes = (db: Database) => {
  const router = Router();

  router.post(
    "/requests",
    asyncRoute(async (req, res) => {
      const input = requestSchema.parse(req.body);
      await verifyHuman(input.captchaToken, req.ip);
      const reference = `VEN-${Date.now().toString(36).toUpperCase()}`;
      const request = await db.create("supportRequests", {
        id: id("support"),
        kind: "support_request",
        reference,
        name: input.name,
        email: input.email,
        category: input.category,
        subject: input.subject,
        message: input.message,
        status: "open",
        createdAt: now(),
        updatedAt: now(),
      });
      created(res, { reference: request.reference, status: request.status });
    }),
  );

  return router;
};
