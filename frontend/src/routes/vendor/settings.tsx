import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Store, KeyRound, Bell, Truck, Shield, User } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBankAccount, updateBankAccount } from "@/services/vendorService";
import { getDeliverySettings, updateDeliverySettings } from "@/services/vendorService";
import { mockVendor } from "@/data/users";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendor/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Vendor — Vendura" },
      { name: "description", content: "Manage your store and account settings." },
      { property: "og:title", content: "Settings — Vendura" },
      { property: "og:description", content: "Manage your store and account settings." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorSettingsPage,
});

const tabs = [
  { id: "profile", label: "Profile", icon: <User className="h-4 w-4" /> },
  { id: "store", label: "Store Info", icon: <Store className="h-4 w-4" /> },
  { id: "password", label: "Password", icon: <KeyRound className="h-4 w-4" /> },
  { id: "bank", label: "Bank", icon: <Shield className="h-4 w-4" /> },
  { id: "delivery", label: "Delivery", icon: <Truck className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
] as const;

type TabId = (typeof tabs)[number]["id"];

function VendorSettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>("profile");
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({ fullName: mockVendor.fullName, email: mockVendor.email, phone: mockVendor.phone ?? "" });
  const [store, setStore] = useState({ name: "TechNaija", description: "Quality tech gadgets and accessories at the best prices.", allowNegotiation: true, returnPolicy: "7-day return on unused items", shippingPolicy: "Ships within 24 hours" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [notifPrefs, setNotifPrefs] = useState({ newOrders: true, newMessages: true, lowStock: true, payouts: true, offers: true });

  const { data: bank } = useQuery({ queryKey: ["vendor-bank"], queryFn: getBankAccount });
  const { data: delivery } = useQuery({ queryKey: ["delivery-settings"], queryFn: getDeliverySettings });

  async function handleSave(section: string) {
    setSaving(true);
    try {
      if (section === "bank" && bank) await updateBankAccount(bankForm);
      if (section === "delivery" && delivery) await updateDeliverySettings({ ...(delivery.pickupAddress ? { pickupAddress: delivery.pickupAddress } : {}), ...(delivery.freeDeliveryAbove ? { freeDeliveryAbove: delivery.freeDeliveryAbove } : {}), pickupAvailable: delivery.pickupAvailable });
      queryClient.invalidateQueries({ queryKey: ["vendor-bank"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      toast.success("Settings saved");
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and store</p>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", tab === t.id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-accent")}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === "profile" && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={profile.fullName} onChange={(v) => setProfile((f) => ({ ...f, fullName: v }))} />
            <Field label="Email" value={profile.email} onChange={(v) => setProfile((f) => ({ ...f, email: v }))} />
            <Field label="Phone" value={profile.phone} onChange={(v) => setProfile((f) => ({ ...f, phone: v }))} />
          </div>
          <button onClick={() => handleSave("profile")} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}

      {/* Store */}
      {tab === "store" && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Store Information</h2>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-soft text-xl font-bold text-primary">TN</div>
            <button className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">Change Logo</button>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Store name</label>
            <input value={store.name} onChange={(e) => setStore((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
            <textarea rows={3} value={store.description} onChange={(e) => setStore((s) => ({ ...s, description: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Return policy</label>
            <input value={store.returnPolicy} onChange={(e) => setStore((s) => ({ ...s, returnPolicy: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3">
            <div><p className="text-sm font-medium text-foreground">Allow negotiation</p><p className="text-xs text-muted-foreground">Let customers make offers on your products</p></div>
            <button type="button" onClick={() => setStore((s) => ({ ...s, allowNegotiation: !s.allowNegotiation }))} className={cn("relative h-6 w-11 rounded-full transition-colors", store.allowNegotiation ? "bg-primary" : "bg-muted")}>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", store.allowNegotiation ? "left-[1.375rem]" : "left-0.5")} />
            </button>
          </label>
          <button onClick={() => handleSave("store")} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
        </div>
      )}

      {/* Password */}
      {tab === "password" && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Change Password</h2>
          <div className="space-y-3">
            <div><label className="mb-1 block text-sm font-medium text-foreground">Current password</label><input type="password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
            <div><label className="mb-1 block text-sm font-medium text-foreground">New password</label><input type="password" value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
            <div><label className="mb-1 block text-sm font-medium text-foreground">Confirm new password</label><input type="password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
          </div>
          <p className="text-xs text-muted-foreground">Password changes are verified and hashed by the backend.</p>
          <button onClick={() => toast.success("Password updated (demo)")} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving..." : "Update Password"}</button>
        </div>
      )}

      {/* Bank */}
      {tab === "bank" && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Bank Account</h2>
          {bank && <p className="text-sm text-muted-foreground">Current: {bank.bankName} · {bank.accountNumber} · {bank.accountName}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="mb-1 block text-sm font-medium text-foreground">Bank</label><input value={bankForm.bankName} onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="GTBank" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
            <div><label className="mb-1 block text-sm font-medium text-foreground">Account number</label><input value={bankForm.accountNumber} onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))} placeholder="0123456789" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
            <div><label className="mb-1 block text-sm font-medium text-foreground">Account name</label><input value={bankForm.accountName} onChange={(e) => setBankForm((f) => ({ ...f, accountName: e.target.value }))} placeholder="TECHNAIJA VENTURES" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></div>
          </div>
          <p className="text-xs text-muted-foreground">Bank accounts are verified by the backend before payouts.</p>
          <button onClick={() => handleSave("bank")} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving..." : "Save Bank"}</button>
        </div>
      )}

      {/* Delivery */}
      {tab === "delivery" && delivery && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Delivery Settings</h2>
          <p className="text-sm text-muted-foreground">Pickup: {delivery.pickupAvailable ? "Enabled" : "Disabled"} · {delivery.pickupAddress ?? "No address"}</p>
          <p className="text-sm text-muted-foreground">Free delivery above: ₦{delivery.freeDeliveryAbove?.toLocaleString() ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{delivery.zones.length} delivery zones configured. Edit zones on the Delivery page.</p>
          <Link to="/vendor/delivery" className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent">Manage Zones</Link>
        </div>
      )}

      {/* Notifications */}
      {tab === "notifications" && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Notification Preferences</h2>
          <div className="space-y-2">
            {(Object.keys(notifPrefs) as (keyof typeof notifPrefs)[]).map((key) => {
              const labels: Record<string, string> = { newOrders: "New orders", newMessages: "New messages", lowStock: "Low stock alerts", payouts: "Payout updates", offers: "New offers" };
              return (
                <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium text-foreground">{labels[key]}</span>
                  <button type="button" onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))} className={cn("relative h-6 w-11 rounded-full transition-colors", notifPrefs[key] ? "bg-primary" : "bg-muted")}>
                    <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", notifPrefs[key] ? "left-[1.375rem]" : "left-0.5")} />
                  </button>
                </label>
              );
            })}
          </div>
          <button onClick={() => toast.success("Preferences saved")} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Save</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
    </div>
  );
}

