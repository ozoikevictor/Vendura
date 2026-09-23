import { createFileRoute } from "@tanstack/react-router";
import { CustomerAIListPage } from "@/components/ai/CustomerAI";
export const Route = createFileRoute("/customer/ai/requests")({
  component: () => <CustomerAIListPage kind="requests" />,
});
