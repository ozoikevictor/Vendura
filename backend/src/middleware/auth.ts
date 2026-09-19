import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";
import type { AuthRequest, AuthUser, Role } from "../types.js";

export function signToken(user: AuthUser) {
  return jwt.sign(user, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new ApiError(401, "Authentication required"));
  try {
    req.user = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export const authorize = (...roles: Role[]) => (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, "You do not have permission to perform this action"));
  next();
};
