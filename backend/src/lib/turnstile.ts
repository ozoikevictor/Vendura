import { config } from "../config.js";
import { ApiError } from "./errors.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEVELOPMENT_SECRET = "1x0000000000000000000000000000000AA";

type TurnstileResult = { success: boolean; "error-codes"?: string[] };

export async function verifyHuman(token: string | undefined, remoteIp?: string) {
  if (config.NODE_ENV === "test") return;
  if (!token) throw new ApiError(403, "Complete the security check");
  const secret = config.TURNSTILE_SECRET_KEY ?? (config.NODE_ENV === "production" ? undefined : DEVELOPMENT_SECRET);
  if (!secret) throw new ApiError(503, "Security verification is not configured");

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new ApiError(503, "Security verification is temporarily unavailable. Please try again.");
  }

  if (!response.ok) throw new ApiError(503, "Security verification is temporarily unavailable. Please try again.");
  const result = await response.json() as TurnstileResult;
  if (!result.success) throw new ApiError(403, "Security check failed. Please try again.");
}
