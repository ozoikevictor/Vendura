import { createFileRoute } from "@tanstack/react-router";
import { VendorProductCreator } from "@/components/ai/VendorAI";
export const Route = createFileRoute("/vendor/ai/products")({ component: VendorProductCreator });
