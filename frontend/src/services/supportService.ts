import { api, json } from "./api";

export type SupportCategory =
  "order" | "payment" | "vendor" | "account" | "technical" | "safety" | "other";

export function createSupportRequest(input: {
  name: string;
  email: string;
  category: SupportCategory;
  subject: string;
  message: string;
  captchaToken: string;
}) {
  return api<{ reference: string; status: string }>("/support/requests", {
    method: "POST",
    ...json(input),
  });
}
