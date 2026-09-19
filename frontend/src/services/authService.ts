import type { User, Customer, Vendor } from "@/types";
import { api, clearToken, json, setToken } from "./api";
import { nigerianStates } from "@/data/users";

export interface LoginInput {
  email: string;
  password: string;
}
export interface CustomerRegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}
export interface VendorRegisterInput {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  password: string;
  businessCategory: string;
  storeDescription: string;
  location: { city: string; state: string };
}

interface AuthResult<T extends User> {
  user: T;
  token: string;
  storefrontPath?: string;
}

export async function login(input: LoginInput): Promise<User> {
  const result = await api<AuthResult<User>>("/auth/login", { method: "POST", ...json(input) });
  setToken(result.token);
  return result.user;
}

export async function registerCustomer(input: CustomerRegisterInput): Promise<Customer> {
  const result = await api<AuthResult<Customer>>("/auth/register/customer", {
    method: "POST",
    ...json(input),
  });
  setToken(result.token);
  return result.user;
}

export async function registerVendor(input: VendorRegisterInput): Promise<Vendor> {
  const result = await api<AuthResult<Vendor>>("/auth/register/vendor", {
    method: "POST",
    ...json(input),
  });
  setToken(result.token);
  return result.user;
}

export const getCurrentUser = () => api<User>("/auth/me");
export async function logout() {
  try {
    await api<void>("/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}
export const requestPasswordReset = (email: string) =>
  api<{ message: string }>("/auth/forgot-password", { method: "POST", ...json({ email }) }).then(
    () => undefined,
  );
export const resetPassword = (token: string, newPassword: string) =>
  api<{ message: string }>("/auth/reset-password", {
    method: "POST",
    ...json({ token, password: newPassword }),
  }).then(() => undefined);
export const verifyEmail = (otp: string) =>
  api<{ verified: boolean }>("/auth/verify-email", { method: "POST", ...json({ otp }) });
export const resendOtp = () =>
  api<{ message: string }>("/auth/resend-otp", { method: "POST" }).then(() => undefined);

export { nigerianStates };
