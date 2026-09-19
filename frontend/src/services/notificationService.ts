import type { Notification, ID } from "@/types";
import { api } from "./api";

export const getNotifications = (_userId: ID) => api<Notification[]>("/notifications");
export const markNotificationRead = (id: ID) =>
  api<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
export const markAllNotificationsRead = (_userId: ID) =>
  api<void>("/notifications/read-all", { method: "PATCH" });
