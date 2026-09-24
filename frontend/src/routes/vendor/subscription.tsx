import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlans, getSubscription, initializeSubscriptionPayment, verifySubscriptionPayment } from "@/services/vendorService";
import { formatNaira, formatDate } from "@/utils/format";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@/services/api";
import { cn } from "@/lib/utils";
import { DataLoader } from "@/components/shared/DataLoader";

export const Route = createFileRoute("/vendor/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription — Vendor — Vendura" },
      { name: "description", content: "Manage your plan." },
      { property: "og:title", content: "Subscription — Vendura" },
      { property: "og:description", content: "Manage your plan." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorSubscriptionPage,
});

function VendorSubscriptionPage() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: getPlans });
  const { data: sub } = useQuery({ queryKey: ["subscription"], queryFn: getSubscription });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") ?? params.get("trxref") ?? window.sessionStorage.getItem("vendura-subscription-payment");
    if (!reference) return;
    setVerifying(true);
    verifySubscriptionPayment(reference).then(() => {
      window.history.replaceState({}, "", "/vendor/subscription");
      window.sessionStorage.removeItem("vendura-subscription-payment");
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Subscription activated for one month");
    }).catch((error) => toast.error(getErrorMessage(error, "Subscription payment could not be verified")))
      .finally(() => setVerifying(false));
  }, [queryClient]);

  async function handleSwitch(planId: "starter" | "growth" | "business") {
    setLoading(true);
    try {
      const payment = await initializeSubscriptionPayment(planId);
      window.sessionStorage.setItem("vendura-subscription-payment", payment.reference);
      window.location.assign(payment.authorizationUrl);
    } catch (error) { toast.error(getErrorMessage(error, "Could not start subscription payment")); setLoading(false); }
  }

  if (!plans || !sub) return <DataLoader label="Loading subscription" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Subscription</h1>
        <p className="text-sm text-muted-foreground">Status: <span className={cn("font-semibold", sub.isActive ? "text-success" : "text-destructive")}>{sub.isActive ? "Active" : "Payment due"}</span> · {sub.isActive ? `Valid until ${formatDate(sub.currentPeriodEnd)}` : "Choose a plan to reactivate your store"}</p>
        {sub.plan && <p className="mt-1 text-xs text-muted-foreground">{sub.productCount ?? 0} of {sub.plan.productLimit ?? "unlimited"} products used</p>}
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === sub.planId;
          return (
            <div key={plan.id} className={cn("relative rounded-xl border p-5", plan.highlighted ? "border-primary bg-primary-soft" : "border-border bg-card")}>
              {plan.highlighted && <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Popular</span>}
              <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatNaira(plan.priceMonthly)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSwitch(plan.id)}
                disabled={loading || verifying}
                className={cn("mt-5 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors",
                  isCurrent ? "border border-border text-muted-foreground" : plan.highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border text-foreground hover:bg-accent")}
              >
                {verifying ? "Verifying payment..." : isCurrent && sub.isActive ? "Renew Current Plan" : `Choose ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Billing info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Billing</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Current period</p>
            <p className="text-sm font-medium text-foreground">{formatDate(sub.currentPeriodStart)} → {formatDate(sub.currentPeriodEnd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Auto-renew</p>
            <p className="text-sm font-medium text-foreground">Manual monthly renewal</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Each successful payment activates the selected plan for one calendar month. Paystack verifies every payment on the backend.</p>
      </div>
    </div>
  );
}
