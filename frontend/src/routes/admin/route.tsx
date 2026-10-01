import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { noindexMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: noindexMeta("Admin | Vendraza", "Private Vendraza admin area."),
  }),
  component: AdminLayout,
});
