import type { OrderStatus, PaymentStatus } from "@/types";
import { ORDER_STATUS_LABEL } from "@/data/orders";
import { cn } from "@/lib/utils";

const statusStyles: Record<OrderStatus, string> = {
  placed: "bg-info-soft text-info",
  payment_confirmed: "bg-info-soft text-info",
  processing: "bg-warning-soft text-warning-foreground",
  shipped: "bg-primary-soft text-primary",
  out_for_delivery: "bg-primary-soft text-primary",
  delivered: "bg-success-soft text-success",
  awaiting_delivery_confirmation: "bg-warning-soft text-warning-foreground",
  payout_pending: "bg-info-soft text-info",
  completed: "bg-success-soft text-success",
  disputed: "bg-destructive-soft text-destructive",
  awaiting_admin_review: "bg-warning-soft text-warning-foreground",
  refund_approved: "bg-info-soft text-info",
  refund_processing: "bg-warning-soft text-warning-foreground",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive-soft text-destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        statusStyles[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

const paymentStyles: Record<PaymentStatus, string> = {
  pending: "bg-warning-soft text-warning-foreground",
  paid: "bg-success-soft text-success",
  failed: "bg-destructive-soft text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Payment Pending",
  paid: "Paid",
  failed: "Payment Failed",
  refunded: "Refunded",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        paymentStyles[status],
      )}
    >
      {paymentLabels[status]}
    </span>
  );
}
