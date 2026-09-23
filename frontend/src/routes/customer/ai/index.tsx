import { createFileRoute } from "@tanstack/react-router";
import { CustomerAIPage } from "@/components/ai/CustomerAI";
export const Route = createFileRoute("/customer/ai/")({ component: CustomerAIPage });
