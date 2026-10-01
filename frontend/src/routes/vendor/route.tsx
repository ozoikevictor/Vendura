import { createFileRoute } from "@tanstack/react-router";
import { VendorLayout } from "@/components/layout/VendorLayout";
import { noindexMeta } from "@/lib/seo";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: noindexMeta("Vendor Dashboard | Vendraza", "Private vendor dashboard on Vendraza."),
  }),
  component: VendorLayout,
});
