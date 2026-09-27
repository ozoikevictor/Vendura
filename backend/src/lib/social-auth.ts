import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";
import { ApiError } from "./errors.js";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export type SocialProvider = "google" | "apple";
export type SocialIdentity = { subject: string; email: string; name?: string; avatarUrl?: string };

export async function verifySocialIdentity(provider: SocialProvider, identityToken: string): Promise<SocialIdentity> {
  const audience = provider === "google" ? config.GOOGLE_CLIENT_ID : config.APPLE_CLIENT_ID;
  if (!audience) throw new ApiError(503, `${provider === "google" ? "Google" : "Apple"} sign-in is not configured`);

  try {
    const { payload } = await jwtVerify(identityToken, provider === "google" ? googleKeys : appleKeys, {
      issuer: provider === "google" ? ["https://accounts.google.com", "accounts.google.com"] : "https://appleid.apple.com",
      audience,
    });
    if (!payload.sub || typeof payload.email !== "string" || payload.email_verified === false) {
      throw new Error("The provider did not return a verified email address");
    }
    return {
      subject: payload.sub,
      email: payload.email.toLowerCase(),
      ...(typeof payload.name === "string" ? { name: payload.name } : {}),
      ...(typeof payload.picture === "string" ? { avatarUrl: payload.picture } : {}),
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, `The ${provider === "google" ? "Google" : "Apple"} sign-in could not be verified`);
  }
}
