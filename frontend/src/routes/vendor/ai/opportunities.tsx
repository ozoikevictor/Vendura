import { createFileRoute } from "@tanstack/react-router";
import { VendorOpportunities } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/opportunities")({
  component: VendorOpportunities,
});
