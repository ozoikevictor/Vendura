import { createFileRoute } from "@tanstack/react-router";
import { CustomerAIListPage } from "@/components/ai/CustomerAI";
export const Route = createFileRoute("/customer/ai/history")({
  component: () => <CustomerAIListPage kind="history" />,
});
