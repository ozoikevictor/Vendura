import { ShieldCheck } from "lucide-react";
import type { EscrowStatus } from "@/types";
import { ESCROW_STATUS_LABEL } from "@/data/orders";
import { cn } from "@/lib/utils";

const escrowStyles: Record<EscrowStatus, string> = {
  not_funded: "bg-muted text-muted-foreground",
  held: "bg-primary-soft text-primary",
  released: "bg-success-soft text-success",
  refunded: "bg-muted text-muted-foreground",
  disputed: "bg-destructive-soft text-destructive",
};

export function EscrowBadge({ status, className }: { status: EscrowStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        escrowStyles[status],
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {ESCROW_STATUS_LABEL[status]}
    </span>
  );
}
