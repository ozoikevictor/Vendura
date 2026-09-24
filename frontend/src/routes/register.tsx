import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import * as authService from "@/services/authService";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import { useStorefrontStore } from "@/store/storefront";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { SocialAuthButtons } from "@/components/shared/SocialAuthButtons";
import { HumanCheck } from "@/components/shared/HumanCheck";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — Vendura" },
      {
        name: "description",
        content: "Create a Vendura customer account to shop from verified vendors.",
      },
      { property: "og:title", content: "Create Account — Vendura" },
      { property: "og:description", content: "Create a Vendura customer account." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.set);
  const activeStoreSlug = useStorefrontStore((state) => state.activeStoreSlug);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaRefresh, setCaptchaRefresh] = useState(0);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (!captchaToken) {
      toast.error("Complete the security check");
      return;
    }
    setLoading(true);
    try {
      const user = await authService.registerCustomer({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        captchaToken,
      });
      setAuth(user);
      if (user.emailVerified) {
        toast.success("Account created successfully!");
        if (activeStoreSlug)
          navigate({ to: "/store/$storeSlug", params: { storeSlug: activeStoreSlug } });
        else navigate({ to: "/marketplace" });
      } else {
        toast.success("Account created! Verify your email.");
        navigate({ to: "/verify-email" });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create account"));
      setCaptchaRefresh((value) => value + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Join Vendura to shop from verified vendors.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <SocialAuthButtons />
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              icon={<User className="h-4 w-4" />}
              label="Full name"
              id="fullName"
              value={form.fullName}
              onChange={set("fullName")}
              placeholder="Chibuike Okafor"
              required
            />
            <Field
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              required
            />
            <Field
              icon={<Phone className="h-4 w-4" />}
              label="Phone"
              id="phone"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="0801 234 5678"
              required
            />

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}"
                  title="Use at least 8 characters, including an uppercase letter and a number."
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Field
              icon={<Lock className="h-4 w-4" />}
              label="Confirm password"
              id="confirm"
              type={showPw ? "text" : "password"}
              value={form.confirm}
              onChange={set("confirm")}
              placeholder="••••••••"
              required
            />

            <HumanCheck onToken={setCaptchaToken} refreshKey={captchaRefresh} />
            <button
              type="submit"
              disabled={loading || !captchaToken}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Want to sell?{" "}
          <Link to="/vendor-register" className="font-semibold text-primary hover:underline">
            Become a seller
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function Field({
  icon,
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  icon: React.ReactNode;
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}
