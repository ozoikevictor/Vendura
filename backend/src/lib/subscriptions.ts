export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 3000,
    productLimit: 20,
    features: ["Up to 20 products", "Public storefront", "Customer messages"],
  },
  {
    id: "growth",
    name: "Growing Business",
    priceMonthly: 7500,
    productLimit: 500,
    features: ["Up to 500 products", "Price negotiation", "Advanced analytics"],
    highlighted: true,
  },
  {
    id: "business",
    name: "Enterprise",
    priceMonthly: 15000,
    productLimit: null,
    features: ["Unlimited products", "Daily payouts", "Priority support"],
  },
] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export function getSubscriptionPlan(planId: string) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}
