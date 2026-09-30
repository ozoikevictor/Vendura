import { createFileRoute } from "@tanstack/react-router";
import { VendorAIAccess, VendorOpportunities } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/opportunities")({
  component: () => <VendorAIAccess><VendorOpportunities /></VendorAIAccess>,
});
