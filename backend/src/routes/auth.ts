import { Router } from "express";
import bcrypt from "bcryptjs";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok, publicUser, slugify } from "../lib/helpers.js";
import { customerRegistration, email, loginSchema, password, vendorRegistration } from "../schemas.js";
import { authenticate, signToken } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";

export const authRoutes = (db: Database) => {
  const router = Router();
  router.post("/register/customer", asyncRoute(async (req, res) => {
    const input = customerRegistration.parse(req.body);
    if (await db.findOne("users", { email: input.email })) throw new ApiError(409, "An account with that email already exists");
    const user = await db.create("users", { id: id("user-customer"), ...input, passwordHash: await bcrypt.hash(input.password, 12), password: undefined, role: "customer", emailVerified: false, verificationOtp: "123456", createdAt: now() } as Entity);
    created(res, { user: publicUser(user), token: signToken({ id: user.id, role: "customer" }) });
  }));
  router.post("/register/vendor", asyncRoute(async (req, res) => {
    const input = vendorRegistration.parse(req.body);
    if (await db.findOne("users", { email: input.email })) throw new ApiError(409, "An account with that email already exists");
    const userId = id("user-vendor");
    const storeId = id("store");
    const baseSlug = slugify(input.businessName);
    const slug = await db.findOne("stores", { slug: baseSlug })
      ? `${baseSlug}-${storeId.slice(-6)}`
      : baseSlug;
    const user = await db.create("users", { id: userId, fullName: input.fullName, email: input.email, phone: input.phone, passwordHash: await bcrypt.hash(input.password, 12), role: "vendor", storeId, emailVerified: false, verificationOtp: "123456", createdAt: now() } as Entity);
    const store = await db.create("stores", { id: storeId, slug, name: input.businessName, description: input.storeDescription, ownerId: userId, categoryIds: [input.businessCategory], location: input.location, rating: 0, reviewCount: 0, productCount: 0, followers: 0, verified: false, allowNegotiation: false, policies: { returns: "", shipping: "" }, contact: { phone: input.phone, email: input.email }, joinedAt: now() });
    created(res, {
      user: publicUser(user),
      store,
      storefrontPath: `/store/${slug}`,
      token: signToken({ id: user.id, role: "vendor", storeId })
    });
  }));
  router.post("/login", asyncRoute(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await db.findOne<Entity>("users", { email: input.email });
    if (!user || typeof user.passwordHash !== "string" || !(await bcrypt.compare(input.password, user.passwordHash))) throw new ApiError(401, "Invalid email or password");
    ok(res, { user: publicUser(user), token: signToken({ id: user.id, role: user.role as "customer" | "vendor" | "admin", storeId: user.storeId as string | undefined }) });
  }));
  router.get("/me", authenticate, asyncRoute(async (req: AuthRequest, res) => {
    const user = await db.get("users", req.user!.id);
    if (!user) throw new ApiError(404, "User not found");
    ok(res, publicUser(user));
  }));
  router.post("/logout", authenticate, (_req, res) => res.status(204).end());
  router.post("/forgot-password", asyncRoute(async (req, res) => {
    const parsed = email.safeParse(req.body.email);
    if (!parsed.success) throw parsed.error;
    const user = await db.findOne("users", { email: parsed.data });
    if (user) await db.update("users", user.id, { resetToken: "test-reset-token", resetTokenExpiresAt: new Date(Date.now() + 3600e3).toISOString() });
    ok(res, { message: "If the account exists, reset instructions have been sent" });
  }));
  router.post("/reset-password", asyncRoute(async (req, res) => {
    const input = zReset.parse(req.body);
    const user = await db.findOne<Entity>("users", { resetToken: input.token });
    if (!user || new Date(user.resetTokenExpiresAt as string) < new Date()) throw new ApiError(400, "Invalid or expired reset token");
    await db.update("users", user.id, { passwordHash: await bcrypt.hash(input.password, 12), resetToken: undefined, resetTokenExpiresAt: undefined });
    ok(res, { message: "Password reset successful" });
  }));
  router.post("/verify-email", authenticate, asyncRoute(async (req: AuthRequest, res) => {
    const otp = String(req.body.otp ?? "");
    const user = await db.get<Entity>("users", req.user!.id);
    if (!user || user.verificationOtp !== otp) throw new ApiError(400, "Invalid verification code");
    await db.update("users", user.id, { emailVerified: true, verificationOtp: undefined });
    ok(res, { verified: true });
  }));
  router.post("/resend-otp", authenticate, asyncRoute(async (req: AuthRequest, res) => { await db.update("users", req.user!.id, { verificationOtp: "123456" }); ok(res, { message: "Verification code generated" }); }));
  return router;
};

import { z } from "zod";
const zReset = z.object({ token: z.string().min(1), password });
