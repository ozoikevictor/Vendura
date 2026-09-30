import type { Database } from "../types.js";

export const FREE_PRODUCT_LIMIT = 5;

export const SUBSCRIPTION_PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 3000,
    productLimit: 20,
    sellerAI: false,
    features: ["Up to 20 products", "Public storefront", "Orders and customer messages", "Basic sales overview"],
  },
  {
    id: "growth",
    name: "Growing Business",
    priceMonthly: 7500,
    productLimit: 200,
    sellerAI: true,
    features: ["Up to 200 products", "AI business assistant", "Buyer opportunity matching", "Price negotiation", "Advanced analytics"],
    highlighted: true,
  },
  {
    id: "business",
    name: "Enterprise",
    priceMonthly: 15000,
    productLimit: null,
    sellerAI: true,
    features: ["Unlimited products", "AI business assistant", "Buyer opportunity matching", "Advanced analytics", "Priority support"],
  },
] as const;

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export function getSubscriptionPlan(planId: string) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId);
}

export async function vendorHasSellerAI(db: Database, vendorId: string) {
  const subscription = await db.findOne("subscriptions", { vendorId });
  if (!subscription || subscription.status !== "active" || Date.parse(String(subscription.currentPeriodEnd)) <= Date.now()) return false;
  return getSubscriptionPlan(String(subscription.planId))?.sellerAI === true;
}
