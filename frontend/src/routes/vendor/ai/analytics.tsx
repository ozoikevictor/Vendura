import { createFileRoute } from "@tanstack/react-router";
import { VendorAIAccess, VendorAIAnalytics } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/analytics")({ component: () => <VendorAIAccess><VendorAIAnalytics /></VendorAIAccess> });
