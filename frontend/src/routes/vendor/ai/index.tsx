import { createFileRoute } from "@tanstack/react-router";
import { VendorAIPage } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/")({ component: VendorAIPage });
