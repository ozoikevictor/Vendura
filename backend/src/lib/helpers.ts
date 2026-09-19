import { randomUUID } from "node:crypto";
import type { Response } from "express";

export const id = (prefix: string) => `${prefix}-${randomUUID()}`;
export const now = () => new Date().toISOString();
export const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const publicUser = <T extends Record<string, unknown>>(user: T) => {
  const {
    passwordHash: _passwordHash,
    resetToken: _resetToken,
    resetTokenHash: _resetTokenHash,
    resetTokenExpiresAt: _resetTokenExpiresAt,
    verificationOtp: _verificationOtp,
    verificationOtpHash: _verificationOtpHash,
    verificationOtpExpiresAt: _verificationOtpExpiresAt,
    verificationAttempts: _verificationAttempts,
    ...safe
  } = user;
  return safe;
};
export const created = (res: Response, data: unknown) => res.status(201).json({ data });
export const ok = (res: Response, data: unknown) => res.json({ data });
