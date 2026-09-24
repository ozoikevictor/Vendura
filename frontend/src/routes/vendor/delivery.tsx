import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Truck, MapPin } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDeliverySettings, updateDeliverySettings } from "@/services/vendorService";
import { formatNaira } from "@/utils/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataLoader } from "@/components/shared/DataLoader";

export const Route = createFileRoute("/vendor/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery — Vendor — Vendura" },
      { name: "description", content: "Configure delivery zones and fees." },
      { property: "og:title", content: "Delivery — Vendura" },
      { property: "og:description", content: "Configure delivery zones and fees." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorDeliveryPage,
});

function VendorDeliveryPage() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ pickupAvailable: true, pickupAddress: "", freeDeliveryAbove: 0 });

  const { data: settings } = useQuery({ queryKey: ["delivery-settings"], queryFn: getDeliverySettings });

  useEffect(() => {
    if (settings) setForm({ pickupAvailable: settings.pickupAvailable, pickupAddress: settings.pickupAddress ?? "", freeDeliveryAbove: settings.freeDeliveryAbove ?? 0 });
  }, [settings]);

  if (!settings) return <DataLoader label="Loading delivery settings" className="min-h-72" />;

  async function handleSave() {
    setSaving(true);
    try {
      await updateDeliverySettings({ ...form });
      queryClient.invalidateQueries({ queryKey: ["delivery-settings"] });
      toast.success("Delivery settings saved");
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Delivery</h1>
        <p className="text-sm text-muted-foreground">Configure zones, fees, and pickup options</p>
      </div>

      {/* Zones */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground"><Truck className="h-4 w-4 text-primary" /> Delivery Zones</h2>
        <div className="mt-3 divide-y divide-border">
          {settings.zones.map((zone) => (
            <div key={zone.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{zone.name}</p>
                <p className="text-xs text-muted-foreground">{zone.states.join(", ")}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{formatNaira(zone.fee)}</p>
                <p className="text-xs text-muted-foreground">{zone.etaDays[0]}–{zone.etaDays[1]} days</p>
              </div>
              <span className={cn("ml-3 rounded-full px-2 py-0.5 text-xs font-medium", zone.active ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                {zone.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Zone fees and ETAs are validated by the backend. Customers never see hardcoded charges.</p>
      </div>

      {/* Pickup & free delivery */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-base font-semibold text-foreground"><MapPin className="h-4 w-4 text-primary" /> Pickup & Free Delivery</h2>
        <div className="mt-3 space-y-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium text-foreground">Allow pickup</span>
            <button type="button" onClick={() => setForm((f) => ({ ...f, pickupAvailable: !f.pickupAvailable }))} className={cn("relative h-6 w-11 rounded-full transition-colors", form.pickupAvailable ? "bg-primary" : "bg-muted")}>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", form.pickupAvailable ? "left-[1.375rem]" : "left-0.5")} />
            </button>
          </label>
          <div>
            <label htmlFor="pickupAddr" className="mb-1 block text-sm font-medium text-foreground">Pickup address</label>
            <input id="pickupAddr" value={form.pickupAddress} onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label htmlFor="freeAbove" className="mb-1 block text-sm font-medium text-foreground">Free delivery above (₦)</label>
            <input id="freeAbove" type="number" value={form.freeDeliveryAbove} onChange={(e) => setForm((f) => ({ ...f, freeDeliveryAbove: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
