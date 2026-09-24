import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Store,
  FileText,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  CreditCard,
  PackageCheck,
} from "lucide-react";
import * as authService from "@/services/authService";
import { useAuthStore } from "@/store/auth";
import { categories } from "@/data/categories";
import { nigerianStates } from "@/data/users";
import { toast } from "sonner";
import { getErrorMessage } from "@/services/api";
import { AuthLayout } from "@/components/layout/AuthLayout";

export const Route = createFileRoute("/vendor-register")({
  head: () => ({
    meta: [
      { title: "Start Selling — Vendura" },
      {
        name: "description",
        content: "Open your store on Vendura and start selling to customers across Nigeria.",
      },
      { property: "og:title", content: "Start Selling — Vendura" },
      { property: "og:description", content: "Open your store on Vendura." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorRegisterPage,
});

const initialForm = {
  fullName: "",
  businessName: "",
  email: "",
  phone: "",
  password: "",
  businessCategory: "",
  storeDescription: "",
  state: "",
  city: "",
};

type FormKey = keyof typeof initialForm;
type FormErrors = Partial<Record<FormKey | "form", string | undefined>>;

function validate(form: typeof initialForm): FormErrors {
  const errors: FormErrors = {};
  if (form.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (form.businessName.trim().length < 2) errors.businessName = "Enter your store name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid email address.";
  if (form.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
  if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (!/[A-Z]/.test(form.password)) errors.password = "Add at least one uppercase letter.";
  else if (!/\d/.test(form.password)) errors.password = "Add at least one number.";
  if (!form.businessCategory)
    errors.businessCategory = "Select the category that best fits your store.";
  if (form.storeDescription.trim().length < 10)
    errors.storeDescription = "Describe what you sell in at least 10 characters.";
  if (!form.state) errors.state = "Select your state.";
  if (form.city.trim().length < 2) errors.city = "Enter your city.";
  return errors;
}

function VendorRegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.set);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((current) => ({ ...current, [k]: undefined, form: undefined }));
    };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please correct the highlighted fields.");
      return;
    }
    setLoading(true);
    try {
      const user = await authService.registerVendor({
        fullName: form.fullName,
        businessName: form.businessName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        businessCategory: form.businessCategory,
        storeDescription: form.storeDescription,
        location: { city: form.city, state: form.state },
      });
      setAuth(user);
      if (user.emailVerified) {
        toast.success("Store created successfully!");
        navigate({ to: "/vendor" });
      } else {
        toast.success("Store created! Verify your email to continue.");
        navigate({ to: "/verify-email" });
      }
    } catch (error) {
      const message = getErrorMessage(error, "Could not create store");
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Start Selling on Vendura</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Open your store and reach customers across Nigeria.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Store, title: "Your storefront", text: "A shareable store link for your customers." },
            { icon: PackageCheck, title: "Simple management", text: "Manage products, stock, and orders in one place." },
            { icon: CreditCard, title: "Secure payments", text: "Track sales, fees, balances, and payouts." },
          ].map((benefit) => (
            <div key={benefit.title} className="rounded-lg border border-border bg-card/80 p-4">
              <benefit.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-2 text-sm font-semibold text-foreground">{benefit.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{benefit.text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                icon={<User className="h-4 w-4" />}
                label="Full name"
                id="fullName"
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="Tunde Bakare"
                error={errors.fullName}
                required
              />
              <Field
                icon={<Store className="h-4 w-4" />}
                label="Business / store name"
                id="businessName"
                value={form.businessName}
                onChange={set("businessName")}
                placeholder="TechNaija"
                error={errors.businessName}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="tunde@technaija.ng"
                error={errors.email}
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
                error={errors.phone}
                required
              />
            </div>
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
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-1 ${errors.password ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
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
              {errors.password && <FieldError id="password-error">{errors.password}</FieldError>}
            </div>
            <div>
              <label
                htmlFor="businessCategory"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Business category
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="businessCategory"
                  required
                  value={form.businessCategory}
                  onChange={set("businessCategory")}
                  aria-invalid={Boolean(errors.businessCategory)}
                  aria-describedby={errors.businessCategory ? "businessCategory-error" : undefined}
                  className={`w-full appearance-none rounded-lg border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:ring-1 ${errors.businessCategory ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.businessCategory && (
                <FieldError id="businessCategory-error">{errors.businessCategory}</FieldError>
              )}
            </div>
            <div>
              <label
                htmlFor="storeDescription"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Store description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <textarea
                  id="storeDescription"
                  required
                  minLength={10}
                  value={form.storeDescription}
                  onChange={set("storeDescription")}
                  aria-invalid={Boolean(errors.storeDescription)}
                  aria-describedby={errors.storeDescription ? "storeDescription-error" : undefined}
                  rows={3}
                  placeholder="Tell customers what you sell..."
                  className={`w-full resize-none rounded-lg border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-1 ${errors.storeDescription ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                />
              </div>
              {errors.storeDescription && (
                <FieldError id="storeDescription-error">{errors.storeDescription}</FieldError>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="state" className="mb-1.5 block text-sm font-medium text-foreground">
                  State
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="state"
                    required
                    value={form.state}
                    onChange={set("state")}
                    aria-invalid={Boolean(errors.state)}
                    aria-describedby={errors.state ? "state-error" : undefined}
                    className={`w-full appearance-none rounded-lg border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:ring-1 ${errors.state ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
                  >
                    <option value="">Select state</option>
                    {nigerianStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.state && <FieldError id="state-error">{errors.state}</FieldError>}
              </div>
              <Field
                icon={<MapPin className="h-4 w-4" />}
                label="City"
                id="city"
                value={form.city}
                onChange={set("city")}
                placeholder="Yaba, Lagos"
                error={errors.city}
                required
              />
            </div>

            {errors.form && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errors.form}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Creating store..." : "Create Store"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already a seller?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
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
  error,
}: {
  icon: React.ReactNode;
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | undefined;
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-1 ${error ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-input focus:border-primary focus:ring-primary"}`}
        />
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
      {children}
    </p>
  );
}
