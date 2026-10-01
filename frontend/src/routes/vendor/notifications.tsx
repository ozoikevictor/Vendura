import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotificationList } from "@/components/shared/NotificationList";
import { DataLoader } from "@/components/shared/DataLoader";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationService";
import { useAuthStore } from "@/store/auth";
import type { Notification } from "@/types";

export const Route = createFileRoute("/vendor/notifications")({
  head: () => ({ meta: [{ title: "Notifications - Vendor - Vendraza" }] }),
  component: VendorNotificationsPage,
});

function VendorNotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const queryKey = ["notifications", user?.id];
  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getNotifications(user!.id),
    enabled: Boolean(user),
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const readAll = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: refresh,
  });
  const unread = notifications.filter((notification) => !notification.read).length;
  const openNotification = (notification: Notification) => {
    if (!notification.read) readOne.mutate(notification.id);
  };

  if (isLoading) return <DataLoader label="Loading notifications" className="min-h-0 flex-1" />;
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          <Link
            to="/vendor"
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            aria-label="Back to overview"
            title="Back to overview"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unread} unread, {notifications.length} total
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => readAll.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {notifications.length > 0 ? (
          <NotificationList notifications={notifications} onOpen={openNotification} />
        ) : (
          <EmptyState
            icon={<Bell className="h-7 w-7" />}
            title="No notifications"
            description="New orders will appear here."
          />
        )}
      </div>
    </div>
  );
}
