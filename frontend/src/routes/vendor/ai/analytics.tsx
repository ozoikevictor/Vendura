import { createFileRoute } from "@tanstack/react-router";
import { VendorAIAnalytics } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/analytics")({ component: VendorAIAnalytics });
