import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, _res, next) =>
  next(new ApiError(404, "Endpoint not found"));

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ error: { message: "Request is too large. Choose an image smaller than 2 MB." } });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: { message: "Validation failed", details: error.flatten() } });
    return;
  }
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: { message: error.message, details: error.details } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { message: "Internal server error" } });
};

export const asyncRoute = (handler: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
