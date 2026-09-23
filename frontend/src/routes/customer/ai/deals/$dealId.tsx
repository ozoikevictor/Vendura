import { createFileRoute } from "@tanstack/react-router";
import { DealRoomPage } from "@/components/ai/CustomerAI";
export const Route = createFileRoute("/customer/ai/deals/$dealId")({ component: DealRoomPage });
