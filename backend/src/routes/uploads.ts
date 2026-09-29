import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { ok } from "../lib/helpers.js";
import { authenticate, authorize } from "../middleware/auth.js";
import type { AuthRequest } from "../types.js";

const BUCKET = "product-images";
const imagePayload = z.object({
  dataUrl: z.string().max(6_000_000),
});

export const uploadRoutes = () => {
  const router = Router();

  router.post(
    "/images/product",
    authenticate,
    authorize("vendor", "admin"),
    asyncRoute(async (req: AuthRequest, res) => {
      const { dataUrl } = imagePayload.parse(req.body);
      const match = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
      if (!match) throw new ApiError(400, "Choose a valid JPG, PNG, or WebP image");

      const bytes = Buffer.from(match[2]!, "base64");
      if (bytes.length === 0 || bytes.length > 4 * 1024 * 1024) {
        throw new ApiError(413, "The compressed image must be smaller than 4 MB");
      }

      const kind = match[1]!.toLowerCase();
      const extension = kind === "jpeg" ? "jpg" : kind;
      const contentType = `image/${kind}`;
      const owner = req.user!.storeId ?? req.user!.id;
      const path = `${encodeURIComponent(owner)}/${Date.now()}-${randomUUID()}.${extension}`;
      const baseUrl = config.SUPABASE_URL!.replace(/\/$/, "");
      const key = config.SUPABASE_SERVICE_ROLE_KEY!;
      const headers: Record<string, string> = {
        apikey: key,
        "Content-Type": contentType,
        "x-upsert": "false",
      };
      if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;

      const response = await fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        headers,
        body: bytes,
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new ApiError(502, `Image upload failed: ${detail}`);
      }

      ok(res, {
        url: `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`,
      });
    }),
  );

  return router;
};
