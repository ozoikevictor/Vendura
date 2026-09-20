import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ImagePlus, KeyRound, Link as LinkIcon, Shield, Store, Truck, User, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { changePassword, nigerianStates, updateProfile } from "@/services/authService";
import { updateVendorStore, getVendorStore } from "@/services/storeService";
import {
  getBankAccount,
  getDeliverySettings,
  getNigerianBanks,
  updateBankAccount,
} from "@/services/vendorService";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor/settings")({
  head: () => ({ meta: [{ title: "Settings — Vendor — Vendura" }] }),
  component: VendorSettingsPage,
});

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "store", label: "Store Info", icon: Store },
  { id: "password", label: "Password", icon: KeyRound },
  { id: "bank", label: "Bank", icon: Shield },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;
type TabId = (typeof tabs)[number]["id"];

const defaultPreferences = {
  newOrders: true,
  newMessages: true,
  lowStock: true,
  payouts: true,
  offers: true,
};

function VendorSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.set);
  const [tab, setTab] = useState<TabId>("profile");
  const [saving, setSaving] = useState<string | null>(null);
  const [profile, setProfile] = useState({ fullName: "", email: "", phone: "" });
  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    city: "",
    state: "",
    allowNegotiation: true,
    returnPolicy: "",
    shippingPolicy: "",
  });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [bankForm, setBankForm] = useState({ bankCode: "", accountNumber: "" });
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [logoError, setLogoError] = useState("");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [bannerError, setBannerError] = useState("");

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["vendor-store", user?.storeId],
    queryFn: () => getVendorStore(user?.id ?? ""),
    enabled: Boolean(user),
  });
  const { data: bank } = useQuery({ queryKey: ["vendor-bank"], queryFn: getBankAccount });
  const { data: banks = [] } = useQuery({ queryKey: ["nigerian-banks"], queryFn: getNigerianBanks });
  const { data: delivery } = useQuery({ queryKey: ["delivery-settings"], queryFn: getDeliverySettings });

  useEffect(() => {
    if (!user) return;
    setProfile({ fullName: user.fullName, email: user.email, phone: user.phone ?? "" });
    setPreferences(user.notificationPreferences ?? defaultPreferences);
  }, [user]);

  useEffect(() => {
    if (!store) return;
    setStoreForm({
      name: store.name,
      description: store.description,
      logoUrl: store.logoUrl ?? "",
      bannerUrl: store.bannerUrl ?? "",
      city: store.location.city,
      state: store.location.state,
      allowNegotiation: store.allowNegotiation,
      returnPolicy: store.policies?.returns ?? "",
      shippingPolicy: store.policies?.shipping ?? "",
    });
  }, [store]);

  async function saveProfile() {
    setSaving("profile");
    try {
      const updated = await updateProfile(profile);
      setUser(updated);
      toast.success(updated.emailVerified ? "Profile saved" : "Profile saved. Verify your new email address.");
      if (!updated.emailVerified) navigate({ to: "/verify-email" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile");
    } finally {
      setSaving(null);
    }
  }

  async function saveStore() {
    setSaving("store");
    try {
      await updateVendorStore({
        name: storeForm.name,
        description: storeForm.description,
        logoUrl: storeForm.logoUrl,
        bannerUrl: storeForm.bannerUrl,
        location: { city: storeForm.city, state: storeForm.state },
        allowNegotiation: storeForm.allowNegotiation,
        policies: { returns: storeForm.returnPolicy, shipping: storeForm.shippingPolicy },
      });
      await queryClient.invalidateQueries({ queryKey: ["vendor-store"] });
      toast.success("Store information saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save store information");
    } finally {
      setSaving(null);
    }
  }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setLogoError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Choose an image smaller than 5 MB.");
      return;
    }
    try {
      const logoUrl = await resizeImage(file, 512);
      setStoreForm((value) => ({ ...value, logoUrl }));
      setLogoUrlInput("");
      setLogoError("");
    } catch {
      setLogoError("This picture could not be opened. Try another image.");
    }
  }

  function applyLogoUrl() {
    const logoUrl = logoUrlInput.trim();
    if (!/^https?:\/\//i.test(logoUrl)) {
      setLogoError("Enter a complete link beginning with http:// or https://.");
      return;
    }
    setStoreForm((value) => ({ ...value, logoUrl }));
    setLogoError("");
  }

  async function uploadBanner(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setBannerError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setBannerError("Choose an image smaller than 8 MB.");
      return;
    }
    try {
      const bannerUrl = await resizeImage(file, 1600, 0.78);
      setStoreForm((value) => ({ ...value, bannerUrl }));
      setBannerUrlInput("");
      setBannerError("");
    } catch {
      setBannerError("This picture could not be opened. Try another image.");
    }
  }

  function applyBannerUrl() {
    const bannerUrl = bannerUrlInput.trim();
    if (!/^https?:\/\//i.test(bannerUrl)) {
      setBannerError("Enter a complete link beginning with http:// or https://.");
      return;
    }
    setStoreForm((value) => ({ ...value, bannerUrl }));
    setBannerError("");
  }

  async function savePassword() {
    if (passwords.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (passwords.next !== passwords.confirm) return toast.error("New passwords do not match");
    setSaving("password");
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setSaving(null);
    }
  }

  async function saveBank() {
    if (!bankForm.bankCode) return toast.error("Select your bank");
    if (!/^\d{10}$/.test(bankForm.accountNumber)) return toast.error("Enter a valid 10-digit account number");
    setSaving("bank");
    try {
      await updateBankAccount(bankForm);
      await queryClient.invalidateQueries({ queryKey: ["vendor-bank"] });
      toast.success("Bank account verified and saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify this bank account");
    } finally {
      setSaving(null);
    }
  }

  async function saveNotifications() {
    setSaving("notifications");
    try {
      const updated = await updateProfile({ notificationPreferences: preferences });
      setUser(updated);
      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save notification preferences");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and store</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium", tab === id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-accent")}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "profile" && <Panel title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={profile.fullName} onChange={(fullName) => setProfile((value) => ({ ...value, fullName }))} />
          <Field label="Email" type="email" value={profile.email} onChange={(email) => setProfile((value) => ({ ...value, email }))} />
          <Field label="Phone" type="tel" value={profile.phone} onChange={(phone) => setProfile((value) => ({ ...value, phone }))} />
        </div>
        <SaveButton saving={saving === "profile"} onClick={saveProfile} />
      </Panel>}

      {tab === "store" && <Panel title="Store Information">
        {storeLoading ? <p className="text-sm text-muted-foreground">Loading your store...</p> : <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name" value={storeForm.name} onChange={(name) => setStoreForm((value) => ({ ...value, name }))} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Store logo</p>
            {storeForm.logoUrl ? <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-border bg-background">
              <img src={storeForm.logoUrl} alt="Store logo preview" className="h-full w-full object-cover" onLoad={() => setLogoError("")} onError={() => setLogoError("This logo link could not be loaded. Upload a picture or try another link.")} />
              <button type="button" aria-label="Remove logo" onClick={() => { setStoreForm((value) => ({ ...value, logoUrl: "" })); setLogoUrlInput(""); setLogoError(""); }} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow"><X className="h-4 w-4" /></button>
            </div> : <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-border bg-background text-muted-foreground"><Store className="h-8 w-8" /></div>}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <ImagePlus className="h-4 w-4" /> Upload picture
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadLogo} className="sr-only" />
              </label>
            </div>
            <div className="flex max-w-xl flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="url" value={logoUrlInput} onChange={(event) => { setLogoUrlInput(event.target.value); setLogoError(""); }} placeholder="Or paste an image link" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="button" onClick={applyLogoUrl} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Use URL</button>
            </div>
            {logoError && <p role="alert" className="text-xs text-destructive">{logoError}</p>}
            <p className="text-xs text-muted-foreground">Upload from your phone or computer, or paste a direct JPG, PNG, or WebP link. Click Save Changes when the preview looks right.</p>
          </div>
          <TextArea label="Description" value={storeForm.description} onChange={(description) => setStoreForm((value) => ({ ...value, description }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" value={storeForm.city} onChange={(city) => setStoreForm((value) => ({ ...value, city }))} placeholder="e.g. Kaduna" />
            <label className="space-y-1 text-sm font-medium text-foreground">State
              <select value={storeForm.state} onChange={(event) => setStoreForm((value) => ({ ...value, state: event.target.value }))} className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select a state</option>
                {nigerianStates.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </label>
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Storefront cover image</p>
            {storeForm.bannerUrl ? <div className="relative aspect-[3/1] w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-background">
              <img src={storeForm.bannerUrl} alt="Store cover preview" className="h-full w-full object-cover" onLoad={() => setBannerError("")} onError={() => setBannerError("This cover-image link could not be loaded. Upload a picture or try another link.")} />
              <button type="button" aria-label="Remove cover image" onClick={() => { setStoreForm((value) => ({ ...value, bannerUrl: "" })); setBannerUrlInput(""); setBannerError(""); }} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow"><X className="h-4 w-4" /></button>
            </div> : <div className="flex aspect-[3/1] w-full max-w-3xl items-center justify-center rounded-lg border border-dashed border-border bg-background text-muted-foreground"><ImagePlus className="h-8 w-8" /></div>}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
              <ImagePlus className="h-4 w-4" /> Upload cover image
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBanner} className="sr-only" />
            </label>
            <div className="flex max-w-3xl flex-col gap-2 sm:flex-row">
              <div className="relative flex-1"><LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="url" value={bannerUrlInput} onChange={(event) => { setBannerUrlInput(event.target.value); setBannerError(""); }} placeholder="Or paste a cover image link" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
              <button type="button" onClick={applyBannerUrl} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Use URL</button>
            </div>
            {bannerError && <p role="alert" className="text-xs text-destructive">{bannerError}</p>}
            <p className="text-xs text-muted-foreground">Use a wide picture at least 1600 × 500 pixels for the clearest full-width storefront cover.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea label="Return policy" value={storeForm.returnPolicy} onChange={(returnPolicy) => setStoreForm((value) => ({ ...value, returnPolicy }))} />
            <TextArea label="Shipping policy" value={storeForm.shippingPolicy} onChange={(shippingPolicy) => setStoreForm((value) => ({ ...value, shippingPolicy }))} />
          </div>
          <Toggle label="Allow negotiation" description="Let customers make offers on your products" checked={storeForm.allowNegotiation} onChange={(allowNegotiation) => setStoreForm((value) => ({ ...value, allowNegotiation }))} />
          <SaveButton saving={saving === "store"} onClick={saveStore} />
        </>}
      </Panel>}

      {tab === "password" && <Panel title="Change Password">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current password" type="password" value={passwords.current} onChange={(current) => setPasswords((value) => ({ ...value, current }))} />
          <Field label="New password" type="password" value={passwords.next} onChange={(next) => setPasswords((value) => ({ ...value, next }))} />
          <Field label="Confirm new password" type="password" value={passwords.confirm} onChange={(confirm) => setPasswords((value) => ({ ...value, confirm }))} />
        </div>
        <SaveButton label="Update Password" saving={saving === "password"} onClick={savePassword} />
      </Panel>}

      {tab === "bank" && <Panel title="Bank Account">
        {bank && <p className="text-sm text-muted-foreground">Current account: {bank.bankName} · {bank.accountNumber} · {bank.accountName}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-foreground">Bank
            <select value={bankForm.bankCode} onChange={(event) => setBankForm((value) => ({ ...value, bankCode: event.target.value }))} className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select a bank</option>
              {banks.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </label>
          <Field label="Account number" inputMode="numeric" value={bankForm.accountNumber} onChange={(accountNumber) => setBankForm((value) => ({ ...value, accountNumber: accountNumber.replace(/\D/g, "").slice(0, 10) }))} placeholder="0123456789" />
        </div>
        <SaveButton label="Verify and Save" saving={saving === "bank"} onClick={saveBank} />
      </Panel>}

      {tab === "delivery" && <Panel title="Delivery Settings">
        <p className="text-sm text-muted-foreground">Pickup is {delivery?.pickupAvailable ? "enabled" : "disabled"}. {delivery?.pickupAddress || "No pickup address has been added."}</p>
        <p className="text-sm text-muted-foreground">{delivery?.zones.length ?? 0} delivery zones configured.</p>
        <Link to="/vendor/delivery" className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">Manage Delivery</Link>
      </Panel>}

      {tab === "notifications" && <Panel title="Notification Preferences">
        {Object.entries({ newOrders: "New orders", newMessages: "New messages", lowStock: "Low stock alerts", payouts: "Payout updates", offers: "New offers" }).map(([key, label]) => (
          <Toggle key={key} label={label} checked={preferences[key as keyof typeof preferences]} onChange={(checked) => setPreferences((value) => ({ ...value, [key]: checked }))} />
        ))}
        <SaveButton saving={saving === "notifications"} onClick={saveNotifications} />
      </Panel>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-lg border border-border bg-card p-5"><h2 className="text-base font-semibold">{title}</h2>{children}</section>;
}

function Field({ label, value, onChange, type = "text", placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return <label className="space-y-1 text-sm font-medium text-foreground">{label}<input required type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-sm font-medium text-foreground">{label}<textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="block w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><p className="text-sm font-medium">{label}</p>{description && <p className="text-xs text-muted-foreground">{description}</p>}</div><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}><span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "left-[1.375rem]" : "left-0.5")} /></button></div>;
}

function SaveButton({ label = "Save Changes", saving, onClick }: { label?: string; saving: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving..." : label}</button>;
}

function resizeImage(file: File, maxSize: number, quality = 0.82) {
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
      resolve(canvas.toDataURL("image/webp", quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image"));
    };
    image.src = objectUrl;
  });
}
