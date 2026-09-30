import { createFileRoute } from "@tanstack/react-router";
import { VendorAIAccess, VendorProductCreator } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/products")({ component: () => <VendorAIAccess><VendorProductCreator /></VendorAIAccess> });
