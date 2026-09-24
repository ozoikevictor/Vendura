import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotificationList } from "@/components/shared/NotificationList";
import { DataLoader } from "@/components/shared/DataLoader";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";
import { useAuthStore } from "@/store/auth";
import type { Notification } from "@/types";

export const Route = createFileRoute("/vendor/notifications")({ head: () => ({ meta: [{ title: "Notifications - Vendor - Vendura" }] }), component: VendorNotificationsPage });

function VendorNotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const queryKey = ["notifications", user?.id];
  const { data: notifications = [], isLoading } = useQuery({ queryKey, queryFn: () => getNotifications(user!.id), enabled: Boolean(user), refetchInterval: 10_000, refetchOnWindowFocus: "always" });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => markAllNotificationsRead(user!.id), onSuccess: refresh });
  const unread = notifications.filter((notification) => !notification.read).length;
  const openNotification = (notification: Notification) => { if (!notification.read) readOne.mutate(notification.id); };

  if (isLoading) return <DataLoader label="Loading notifications" className="min-h-72" />;
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4"><div><h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1><p className="text-sm text-muted-foreground">{unread} unread, {notifications.length} total</p></div>
      {unread > 0 && <button type="button" onClick={() => readAll.mutate()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"><CheckCheck className="h-4 w-4" /> Mark all as read</button>}
    </div>
    {notifications.length > 0 ? <NotificationList notifications={notifications} onOpen={openNotification} /> : <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="New orders will appear here." />}
  </div>;
}
