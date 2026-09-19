const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const TOKEN_KEY = "vendura-token";

type ApiEnvelope<T> = { data: T };
type ApiErrorEnvelope = { error?: { message?: string; details?: unknown } };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const details = error.details as
      { fieldErrors?: Record<string, string[] | undefined>; formErrors?: string[] } | undefined;
    const fieldMessage = Object.values(details?.fieldErrors ?? {})
      .flat()
      .find(Boolean);
    return fieldMessage ?? details?.formErrors?.[0] ?? error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

export function getToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
    throw new ApiError(
      response.status,
      payload.error?.message ?? "Request failed",
      payload.error?.details,
    );
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export const json = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });
