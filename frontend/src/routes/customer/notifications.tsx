import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotificationList } from "@/components/shared/NotificationList";
import { DataLoader } from "@/components/shared/DataLoader";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";
import { useAuthStore } from "@/store/auth";
import type { Notification } from "@/types";

export const Route = createFileRoute("/customer/notifications")({ head: () => ({ meta: [{ title: "Your Notifications - Vendura" }] }), component: CustomerNotificationsPage });

function CustomerNotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const queryKey = ["notifications", user?.id];
  const { data: notifications = [], isLoading } = useQuery({ queryKey, queryFn: () => getNotifications(user!.id), enabled: user?.role === "customer", refetchInterval: 10_000, refetchOnWindowFocus: "always" });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => markAllNotificationsRead(user!.id), onSuccess: refresh });
  const unread = notifications.filter((notification) => !notification.read).length;
  const openNotification = (notification: Notification) => { if (!notification.read) readOne.mutate(notification.id); };

  return <div className="flex min-h-screen flex-col lagoon-wash"><MarketplaceHeader /><main className="mx-auto min-h-[60vh] w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
    <div className="mb-5 flex items-start justify-between gap-4"><div><h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1><p className="text-sm text-muted-foreground">{unread} unread, {notifications.length} total</p></div>
      {unread > 0 && <button type="button" onClick={() => readAll.mutate()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"><CheckCheck className="h-4 w-4" /> Mark all as read</button>}
    </div>
    {isLoading ? <DataLoader label="Loading notifications" className="min-h-72" /> : notifications.length > 0 ? <NotificationList notifications={notifications} onOpen={openNotification} /> : <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications" description="Updates about your orders will appear here." />}
  </main></div>;
}
