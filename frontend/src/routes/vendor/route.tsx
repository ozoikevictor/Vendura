import { createFileRoute } from "@tanstack/react-router";
import { VendorLayout } from "@/components/layout/VendorLayout";

export const Route = createFileRoute("/vendor")({
  component: VendorLayout,
});
