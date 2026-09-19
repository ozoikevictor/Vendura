import { Router } from "express";
import bcrypt from "bcryptjs";
import { asyncRoute, ApiError } from "../lib/errors.js";
import { created, id, now, ok, publicUser, slugify } from "../lib/helpers.js";
import { customerRegistration, email, loginSchema, password, vendorRegistration } from "../schemas.js";
import { authenticate, signToken } from "../middleware/auth.js";
import type { AuthRequest, Database, Entity } from "../types.js";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { resetEmail, sendEmail, verificationEmail } from "../lib/email.js";

export const authRoutes = (db: Database) => {
  const router = Router();
  router.post("/register/customer", asyncRoute(async (req, res) => {
    const input = customerRegistration.parse(req.body);
    if (await db.findOne("users", { email: input.email })) throw new ApiError(409, "An account with that email already exists");
    const verification = createVerification();
    const user = await db.create("users", { id: id("user-customer"), ...input, passwordHash: await bcrypt.hash(input.password, 12), password: undefined, role: "customer", emailVerified: false, ...verification.patch, createdAt: now() } as Entity);
    try { await sendVerification(user, verification.code); } catch { await db.remove("users", user.id); throw new ApiError(503, "We could not send the verification email. Please try again shortly."); }
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
    const verification = createVerification();
    const user = await db.create("users", { id: userId, fullName: input.fullName, email: input.email, phone: input.phone, passwordHash: await bcrypt.hash(input.password, 12), role: "vendor", storeId, emailVerified: false, ...verification.patch, createdAt: now() } as Entity);
    const store = await db.create("stores", { id: storeId, slug, name: input.businessName, description: input.storeDescription, ownerId: userId, categoryIds: [input.businessCategory], location: input.location, rating: 0, reviewCount: 0, productCount: 0, followers: 0, verified: false, allowNegotiation: false, policies: { returns: "", shipping: "" }, contact: { phone: input.phone, email: input.email }, joinedAt: now() });
    try { await sendVerification(user, verification.code); } catch { await db.remove("stores", store.id); await db.remove("users", user.id); throw new ApiError(503, "We could not send the verification email. Please try again shortly."); }
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
    if (user.status === "suspended") throw new ApiError(403, "This account has been suspended. Contact Vendura support.");
    ok(res, { user: publicUser(user), token: signToken({ id: user.id, role: user.role as "customer" | "vendor" | "admin", storeId: user.storeId as string | undefined }) });
  }));
  router.get("/me", authenticate, asyncRoute(async (req: AuthRequest, res) => {
    const user = await db.get("users", req.user!.id);
    if (!user) throw new ApiError(404, "User not found");
    ok(res, publicUser(user));
  }));
  router.post("/logout", authenticate, (_req, res) => res.status(204).end());
  router.post("/change-password", authenticate, asyncRoute(async (req: AuthRequest, res) => {
    const input = zChangePassword.parse(req.body);
    const user = await db.get<Entity>("users", req.user!.id);
    if (!user || typeof user.passwordHash !== "string" || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new ApiError(400, "Current password is incorrect");
    }
    if (await bcrypt.compare(input.newPassword, user.passwordHash)) throw new ApiError(400, "New password must be different from the current password");
    await db.update("users", user.id, { passwordHash: await bcrypt.hash(input.newPassword, 12), passwordChangedAt: now(), updatedAt: now() });
    ok(res, { message: "Password changed successfully" });
  }));
  router.post("/forgot-password", asyncRoute(async (req, res) => {
    const parsed = email.safeParse(req.body.email);
    if (!parsed.success) throw parsed.error;
    const user = await db.findOne<Entity>("users", { email: parsed.data });
    if (user) {
      const lastSent = Date.parse(String(user.resetEmailSentAt ?? 0));
      if (Date.now() - lastSent >= 60_000) {
        const token = randomBytes(32).toString("hex");
        await db.update("users", user.id, { resetTokenHash: hashSecret(token), resetTokenExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), resetEmailSentAt: now() });
        const baseUrl = config.FRONTEND_URL.split(",")[0].replace(/\/$/, "");
        try { await sendEmail({ to: String(user.email), subject: "Reset your Vendura password", html: resetEmail(String(user.fullName ?? "there"), `${baseUrl}/reset-password?token=${token}`), tag: "password_reset" }); } catch { await db.update("users", user.id, { resetTokenHash: undefined, resetTokenExpiresAt: undefined }); }
      }
    }
    ok(res, { message: "If the account exists, reset instructions have been sent" });
  }));
  router.post("/reset-password", asyncRoute(async (req, res) => {
    const input = zReset.parse(req.body);
    const tokenHash = hashSecret(input.token);
    const user = (await db.list<Entity>("users")).find((candidate) => safeEqual(String(candidate.resetTokenHash ?? ""), tokenHash));
    if (!user || Date.parse(String(user.resetTokenExpiresAt)) < Date.now()) throw new ApiError(400, "Invalid or expired reset link");
    await db.update("users", user.id, { passwordHash: await bcrypt.hash(input.password, 12), resetTokenHash: undefined, resetTokenExpiresAt: undefined, resetEmailSentAt: undefined, passwordChangedAt: now() });
    ok(res, { message: "Password reset successful" });
  }));
  router.post("/verify-email", authenticate, asyncRoute(async (req: AuthRequest, res) => {
    const otp = zOtp.parse(req.body).otp;
    const user = await db.get<Entity>("users", req.user!.id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.emailVerified) return ok(res, { verified: true });
    if (Date.parse(String(user.verificationOtpExpiresAt)) < Date.now()) throw new ApiError(400, "This verification code has expired. Request a new code.");
    const attempts = Number(user.verificationAttempts ?? 0);
    if (attempts >= 5) throw new ApiError(429, "Too many incorrect attempts. Request a new code.");
    if (!safeEqual(String(user.verificationOtpHash ?? ""), hashSecret(otp))) {
      await db.update("users", user.id, { verificationAttempts: attempts + 1 });
      throw new ApiError(400, "Invalid verification code");
    }
    await db.update("users", user.id, { emailVerified: true, verificationOtpHash: undefined, verificationOtpExpiresAt: undefined, verificationAttempts: undefined, verificationSentAt: undefined, verificationResendCount: undefined, verificationWindowStartedAt: undefined });
    ok(res, { verified: true });
  }));
  router.post("/resend-otp", authenticate, asyncRoute(async (req: AuthRequest, res) => {
    const user = await db.get<Entity>("users", req.user!.id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.emailVerified) return ok(res, { message: "Email is already verified" });
    const lastSent = Date.parse(String(user.verificationSentAt ?? 0));
    if (Date.now() - lastSent < 60_000) throw new ApiError(429, "Please wait one minute before requesting another code");
    const windowStarted = Date.parse(String(user.verificationWindowStartedAt ?? 0));
    const withinWindow = Date.now() - windowStarted < 60 * 60_000;
    const count = withinWindow ? Number(user.verificationResendCount ?? 0) : 0;
    if (count >= 5) throw new ApiError(429, "Too many codes requested. Try again in one hour.");
    const verification = createVerification();
    await sendVerification(user, verification.code);
    await db.update("users", user.id, { ...verification.patch, verificationResendCount: count + 1, verificationWindowStartedAt: withinWindow ? user.verificationWindowStartedAt : now() });
    ok(res, { message: "A new verification code was sent" });
  }));
  return router;
};

import { z } from "zod";
const zReset = z.object({ token: z.string().min(1), password });
const zChangePassword = z.object({ currentPassword: z.string().min(1), newPassword: password });
const zOtp = z.object({ otp: z.string().regex(/^\d{6}$/) });

function createVerification() {
  const code = String(randomInt(100000, 1_000_000));
  return { code, patch: { verificationOtpHash: hashSecret(code), verificationOtpExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), verificationAttempts: 0, verificationSentAt: now() } };
}

const hashSecret = (value: string) => createHash("sha256").update(`${value}:${config.JWT_SECRET}`).digest("hex");
function safeEqual(left: string, right: string) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
const sendVerification = (user: Entity, code: string) => sendEmail({ to: String(user.email), subject: "Verify your Vendura email", html: verificationEmail(String(user.fullName ?? "there"), code), tag: "email_verification" });
