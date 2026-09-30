import { createFileRoute } from "@tanstack/react-router";
import { VendorAIAccess, VendorAIPage } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/")({ component: () => <VendorAIAccess><VendorAIPage /></VendorAIAccess> });
