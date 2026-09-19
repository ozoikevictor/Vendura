import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, CheckCircle2, CircleCheck, Clock3, MessageSquare, ShoppingBag, Tag, Truck, Wallet, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/utils/format";
import type { Notification } from "@/types";

const icons: Partial<Record<Notification["type"], React.ReactNode>> = {
  new_order: <ShoppingBag className="h-4 w-4" />, new_message: <MessageSquare className="h-4 w-4" />,
  new_offer: <Tag className="h-4 w-4" />, offer_accepted: <CheckCircle2 className="h-4 w-4" />,
  offer_rejected: <XCircle className="h-4 w-4" />, low_stock: <AlertTriangle className="h-4 w-4" />,
  payment_received: <Wallet className="h-4 w-4" />, payout_processed: <Wallet className="h-4 w-4" />,
  order_confirmed: <CircleCheck className="h-4 w-4" />, order_processing: <Clock3 className="h-4 w-4" />,
  order_shipped: <Truck className="h-4 w-4" />, order_delivered: <CheckCircle2 className="h-4 w-4" />,
  order_cancelled: <XCircle className="h-4 w-4" />, order_refunded: <Wallet className="h-4 w-4" />,
  system: <Bell className="h-4 w-4" />,
};
const tints: Partial<Record<Notification["type"], string>> = {
  new_order: "bg-primary-soft text-primary", new_message: "bg-accent text-foreground",
  new_offer: "bg-warning-soft text-warning-foreground", offer_accepted: "bg-success-soft text-success",
  offer_rejected: "bg-destructive-soft text-destructive", low_stock: "bg-warning-soft text-warning-foreground",
  payment_received: "bg-success-soft text-success", payout_processed: "bg-success-soft text-success",
  order_confirmed: "bg-success-soft text-success", order_processing: "bg-warning-soft text-warning-foreground",
  order_shipped: "bg-primary-soft text-primary", order_delivered: "bg-success-soft text-success",
  order_cancelled: "bg-destructive-soft text-destructive", order_refunded: "bg-accent text-foreground",
  system: "bg-accent text-foreground",
};

export function NotificationList({ notifications, onOpen }: { notifications: Notification[]; onOpen: (notification: Notification) => void }) {
  return <div className="divide-y divide-border rounded-lg border border-border bg-card">
    {notifications.map((notification) => <Link key={notification.id} to={notification.href ?? "/"} onClick={() => onOpen(notification)} className={cn("flex items-start gap-3 p-4 transition-colors hover:bg-accent", !notification.read && "bg-primary-soft/30")}>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tints[notification.type])}>{icons[notification.type] ?? <Bell className="h-4 w-4" />}</div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-foreground">{notification.title}</p>{!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}</div><p className="line-clamp-2 text-sm text-muted-foreground">{notification.body}</p><p className="mt-1 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p></div>
    </Link>)}
  </div>;
}
