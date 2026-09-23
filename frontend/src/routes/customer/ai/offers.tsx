import { createFileRoute } from "@tanstack/react-router";
import { CustomerAIListPage } from "@/components/ai/CustomerAI";
export const Route = createFileRoute("/customer/ai/offers")({
  component: () => <CustomerAIListPage kind="offers" />,
});
