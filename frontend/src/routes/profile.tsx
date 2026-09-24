import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { Camera, Heart, KeyRound, LogOut, Mail, MessageSquare, Package, Phone, Save, ShoppingBasket, Trash2, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/store/auth";
import { changePassword, logout, updateProfile } from "@/services/authService";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Vendura" },
      { name: "description", content: "Manage your Vendura customer account." },
      { property: "og:title", content: "Profile — Vendura" },
      { property: "og:description", content: "Manage your Vendura customer account." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clear, set: setUser } = useAuthStore();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", avatarUrl: "" });
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [imageError, setImageError] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (!user) return;
    setForm({ fullName: user.fullName, email: user.email, phone: user.phone ?? "", avatarUrl: user.avatarUrl ?? "" });
  }, [user]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clear();
      queryClient.clear();
      navigate({ to: "/login", replace: true });
    }
  }

  async function handlePicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Choose an image smaller than 5 MB.");
      return;
    }
    try {
      const avatarUrl = await resizeImage(file, 512);
      setForm((current) => ({ ...current, avatarUrl }));
      setImageError("");
    } catch {
      setImageError("This picture could not be opened. Try another image.");
    }
  }

  async function saveProfile() {
    if (form.fullName.trim().length < 2) { toast.error("Enter your full name"); return; }
    setSaving(true);
    try {
      const updated = await updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatarUrl: form.avatarUrl,
      });
      setUser(updated);
      toast.success(updated.emailVerified ? "Profile saved" : "Profile saved. Verify your new email address.");
      if (!updated.emailVerified) navigate({ to: "/verify-email" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (!passwords.current) { toast.error("Enter your current password"); return; }
    if (passwords.next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (passwords.next !== passwords.confirm) { toast.error("New passwords do not match"); return; }
    setSavingPassword(true);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change your password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen lagoon-wash">
        <MarketplaceHeader publicMode />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <EmptyState
            title="Log in to view your profile"
            description="Your orders, wishlist, cart, messages, and account details stay under your customer profile."
            icon={<User className="h-8 w-8" />}
            action={<Link to="/login" className="text-sm font-semibold text-primary hover:underline">Log in</Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lagoon-wash">
      <MarketplaceHeader />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Customer account</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-foreground">My profile</h1>
            </div>
            <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[12rem_1fr]">
            <div>
              <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full border border-border bg-primary-soft text-primary">
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold">
                    {user.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                  </div>
                )}
                <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center justify-center gap-1 bg-foreground/75 py-2 text-xs font-semibold text-white">
                  <Camera className="h-3.5 w-3.5" /> Change
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePicture} className="sr-only" />
                </label>
              </div>
              {form.avatarUrl && (
                <button type="button" onClick={() => setForm((current) => ({ ...current, avatarUrl: "" }))} className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline">
                  <Trash2 className="h-3.5 w-3.5" /> Remove picture
                </button>
              )}
              {imageError && <p className="mt-2 text-center text-xs text-destructive">{imageError}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileField label="Full name" icon={<User className="h-4 w-4" />} value={form.fullName} onChange={(fullName) => setForm((current) => ({ ...current, fullName }))} />
              <ProfileField label="Phone" icon={<Phone className="h-4 w-4" />} value={form.phone} onChange={(phone) => setForm((current) => ({ ...current, phone }))} />
              <div className="sm:col-span-2">
                <ProfileField label="Email" icon={<Mail className="h-4 w-4" />} type="email" value={form.email} onChange={(email) => setForm((current) => ({ ...current, email }))} />
              </div>
              <div className="sm:col-span-2">
                <button type="button" onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save profile"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Change password</h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ProfileField label="Current password" icon={<KeyRound className="h-4 w-4" />} type="password" value={passwords.current} onChange={(current) => setPasswords((value) => ({ ...value, current }))} />
            <ProfileField label="New password" icon={<KeyRound className="h-4 w-4" />} type="password" value={passwords.next} onChange={(next) => setPasswords((value) => ({ ...value, next }))} />
            <ProfileField label="Confirm password" icon={<KeyRound className="h-4 w-4" />} type="password" value={passwords.confirm} onChange={(confirm) => setPasswords((value) => ({ ...value, confirm }))} />
          </div>
          <button type="button" onClick={savePassword} disabled={savingPassword} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60">
            <KeyRound className="h-4 w-4" /> {savingPassword ? "Updating..." : "Update password"}
          </button>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileLink to="/customer/orders" icon={<Package className="h-5 w-5" />} title="Orders" description="Track purchases and delivery status." />
          <ProfileLink to="/messages" icon={<MessageSquare className="h-5 w-5" />} title="Messages" description="Continue conversations with sellers." />
          <ProfileLink to="/wishlist" icon={<Heart className="h-5 w-5" />} title="Wishlist" description="Return to products you saved." />
          <ProfileLink to="/cart" icon={<ShoppingBasket className="h-5 w-5" />} title="Cart" description="Review items before checkout." />
          <ProfileLink to="/stores" icon={<User className="h-5 w-5" />} title="Stores" description="Find vendors and storefronts." />
          <ProfileLink to="/marketplace" icon={<Package className="h-5 w-5" />} title="Marketplace" description="Shop products from all vendors." />
        </div>
      </div>

    </div>
  );
}

function ProfileField({ label, icon, value, onChange, type = "text" }: { label: string; icon: React.ReactNode; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <span className="relative mt-1 block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </span>
    </label>
  );
}

function resizeImage(file: File, maxSize: number) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas is unavailable"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/webp", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image"));
    };
    image.src = objectUrl;
  });
}

function ProfileLink({
  to,
  icon,
  title,
  description,
}: {
  to: NonNullable<React.ComponentProps<typeof Link>["to"]>;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-frost"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
        {icon}
      </div>
      <h2 className="mt-3 text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
