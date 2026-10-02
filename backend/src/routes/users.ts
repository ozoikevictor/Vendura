import { Router } from "express";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok, publicUser } from "../lib/helpers.js";
import { authenticate } from "../middleware/auth.js";
import { addressSchema } from "../schemas.js";
import type { AuthRequest, Database, Entity } from "../types.js";
import { config } from "../config.js";
import { sendEmail, verificationEmail } from "../lib/email.js";

export const userRoutes = (db: Database) => {
  const router = Router();
  router.use(authenticate);
  router.patch(
    "/me",
    asyncRoute(async (req: AuthRequest, res) => {
      const input = profileSchema.parse(req.body);
      const current = await db.get<Entity>("users", req.user!.id);
      if (!current) throw new ApiError(404, "User not found");
      const patch: Partial<Entity> = { ...input, updatedAt: now() };
      if (input.email && input.email !== current.email) {
        const existing = await db.findOne<Entity>("users", {
          email: input.email,
        });
        if (existing && existing.id !== current.id)
          throw new ApiError(409, "An account with that email already exists");
        const code = String(randomInt(100000, 1_000_000));
        await sendEmail({
          to: input.email,
          subject: "Verify your new Vendraza email",
          html: verificationEmail(
            String(input.fullName ?? current.fullName ?? "there"),
            code,
          ),
          tag: "email_change",
        });
        Object.assign(patch, {
          emailVerified: false,
          verificationOtpHash: hashSecret(code),
          verificationOtpExpiresAt: new Date(
            Date.now() + 10 * 60_000,
          ).toISOString(),
          verificationAttempts: 0,
          verificationSentAt: now(),
        });
      }
      const user = await db.update("users", req.user!.id, patch);
      if (!user) throw new ApiError(404, "User not found");
      ok(res, publicUser(user));
    }),
  );
  router.get(
    "/me/wishlist",
    asyncRoute(async (req: AuthRequest, res) => {
      const user = await currentUser(db, req.user!.id);
      ok(res, getStringList(user.wishlistProductIds));
    }),
  );
  router.post(
    "/me/wishlist/:productId",
    asyncRoute(async (req: AuthRequest, res) => {
      const productId = String(req.params.productId);
      const product = await db.get<Entity>("products", productId);
      if (!product) throw new ApiError(404, "Product not found");
      const user = await currentUser(db, req.user!.id);
      const ids = addUnique(getStringList(user.wishlistProductIds), productId);
      await db.update("users", user.id, {
        wishlistProductIds: ids,
        updatedAt: now(),
      });
      ok(res, ids);
    }),
  );
  router.delete(
    "/me/wishlist/:productId",
    asyncRoute(async (req: AuthRequest, res) => {
      const productId = String(req.params.productId);
      const user = await currentUser(db, req.user!.id);
      const ids = getStringList(user.wishlistProductIds).filter(
        (id) => id !== productId,
      );
      await db.update("users", user.id, {
        wishlistProductIds: ids,
        updatedAt: now(),
      });
      ok(res, ids);
    }),
  );
  router.delete(
    "/me/wishlist",
    asyncRoute(async (req: AuthRequest, res) => {
      const user = await currentUser(db, req.user!.id);
      await db.update("users", user.id, {
        wishlistProductIds: [],
        updatedAt: now(),
      });
      ok(res, []);
    }),
  );
  router.get(
    "/me/store-follows/:storeId",
    asyncRoute(async (req: AuthRequest, res) => {
      const store = await db.get<Entity>("stores", String(req.params.storeId));
      if (!store) throw new ApiError(404, "Store not found");
      const user = await currentUser(db, req.user!.id);
      ok(res, {
        following: getStringList(user.followedStoreIds).includes(store.id),
        followers: Number(store.followers ?? 0),
      });
    }),
  );
  router.post(
    "/me/store-follows/:storeId",
    asyncRoute(async (req: AuthRequest, res) => {
      const storeId = String(req.params.storeId);
      const store = await db.get<Entity>("stores", storeId);
      if (!store) throw new ApiError(404, "Store not found");
      const user = await currentUser(db, req.user!.id);
      const currentIds = getStringList(user.followedStoreIds);
      const alreadyFollowing = currentIds.includes(storeId);
      const ids = addUnique(currentIds, storeId);
      const followers = alreadyFollowing
        ? Number(store.followers ?? 0)
        : Number(store.followers ?? 0) + 1;
      await Promise.all([
        db.update("users", user.id, {
          followedStoreIds: ids,
          updatedAt: now(),
        }),
        alreadyFollowing
          ? Promise.resolve(store)
          : db.update("stores", store.id, { followers, updatedAt: now() }),
      ]);
      ok(res, { following: true, followers });
    }),
  );
  router.delete(
    "/me/store-follows/:storeId",
    asyncRoute(async (req: AuthRequest, res) => {
      const storeId = String(req.params.storeId);
      const store = await db.get<Entity>("stores", storeId);
      if (!store) throw new ApiError(404, "Store not found");
      const user = await currentUser(db, req.user!.id);
      const currentIds = getStringList(user.followedStoreIds);
      const wasFollowing = currentIds.includes(storeId);
      const ids = currentIds.filter((id) => id !== storeId);
      const followers = wasFollowing
        ? Math.max(0, Number(store.followers ?? 0) - 1)
        : Number(store.followers ?? 0);
      await Promise.all([
        db.update("users", user.id, {
          followedStoreIds: ids,
          updatedAt: now(),
        }),
        wasFollowing
          ? db.update("stores", store.id, { followers, updatedAt: now() })
          : Promise.resolve(store),
      ]);
      ok(res, { following: false, followers });
    }),
  );
  router.get(
    "/me/addresses",
    asyncRoute(async (req: AuthRequest, res) =>
      ok(
        res,
        (await db.list<Entity>("addresses")).filter(
          (a) => a.userId === req.user!.id,
        ),
      ),
    ),
  );
  router.post(
    "/me/addresses",
    asyncRoute(async (req: AuthRequest, res) => {
      const input = addressSchema.parse(req.body);
      if (input.isDefault) await clearDefaults(db, req.user!.id);
      created(
        res,
        await db.create("addresses", {
          id: id("address"),
          userId: req.user!.id,
          ...input,
        }),
      );
    }),
  );
  router.patch(
    "/me/addresses/:id",
    asyncRoute(async (req: AuthRequest, res) => {
      const address = await ownedAddress(
        db,
        String(req.params.id),
        req.user!.id,
      );
      const patch = addressSchema.partial().parse(req.body);
      if (patch.isDefault) await clearDefaults(db, req.user!.id);
      ok(res, await db.update("addresses", address.id, patch));
    }),
  );
  router.delete(
    "/me/addresses/:id",
    asyncRoute(async (req: AuthRequest, res) => {
      const addressId = String(req.params.id);
      await ownedAddress(db, addressId, req.user!.id);
      await db.remove("addresses", addressId);
      res.status(204).end();
    }),
  );
  return router;
};
const optionalPhoneSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(7).max(20).optional(),
);

const profileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
    phone: optionalPhoneSchema,
    avatarUrl: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          /^https?:\/\//i.test(value) ||
          /^data:image\/(jpeg|png|webp);base64,/i.test(value),
        "Profile picture must be an HTTP image URL or an uploaded JPG, PNG, or WebP image",
      )
      .optional(),
    notificationPreferences: z
      .object({
        newOrders: z.boolean(),
        newMessages: z.boolean(),
        lowStock: z.boolean(),
        payouts: z.boolean(),
        offers: z.boolean(),
      })
      .optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one profile field",
  );
const hashSecret = (value: string) =>
  createHash("sha256").update(`${value}:${config.JWT_SECRET}`).digest("hex");
async function ownedAddress(db: Database, id: string, userId: string) {
  const address = await db.get<Entity>("addresses", id);
  if (!address) throw new ApiError(404, "Address not found");
  if (address.userId !== userId)
    throw new ApiError(403, "Address belongs to another user");
  return address;
}
async function clearDefaults(db: Database, userId: string) {
  for (const address of (await db.list<Entity>("addresses")).filter(
    (a) => a.userId === userId && a.isDefault,
  ))
    await db.update("addresses", address.id, { isDefault: false });
}
async function currentUser(db: Database, userId: string) {
  const user = await db.get<Entity>("users", userId);
  if (!user) throw new ApiError(404, "User not found");
  return user;
}
function getStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
function addUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}
