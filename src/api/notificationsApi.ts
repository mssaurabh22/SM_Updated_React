import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "./employeesApi";

export const NOTIFICATION_TYPES = [
  "LEAD_REASSIGNED",
  "VISIT_MISSED",
  "LEAD_LAPSED",
  "LEAD_LAPSED_DIGEST",
  "LEAVE_REQUEST_SUBMITTED",
  "LEAVE_REQUEST_APPROVED",
  "LEAVE_REQUEST_REJECTED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  organizationId: string;
  recipientId: string;
  type: NotificationType;
  /** A JSON string - parse it (defensively) if you want details, e.g. companyName/leadId. */
  payload: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  size?: number;
}

export async function getNotifications(
  params: GetNotificationsParams = {},
): Promise<PagedResponse<Notification>> {
  const response = await axiosInstance.get<PagedResponse<Notification>>(
    "/notifications",
    { params },
  );
  return response.data;
}

export async function markNotificationRead(
  id: string,
): Promise<Notification> {
  const response = await axiosInstance.patch<Notification>(
    `/notifications/${id}/read`,
  );
  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await axiosInstance.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return response.data.count;
}

export async function markAllNotificationsRead(): Promise<void> {
  await axiosInstance.patch("/notifications/read-all");
}

/**
 * Polls every 30s - a simple, upgradeable-to-push mechanism per the project's
 * notification design, so the bell/badge stay reasonably current without a
 * websocket.
 */
export function useNotifications(unreadOnly = false, params: GetNotificationsParams = {}) {
  return useQuery({
    queryKey: ["notifications", { unreadOnly, ...params }],
    queryFn: () => getNotifications({ unreadOnly, ...params }),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * The bell badge's source of truth - a dedicated count endpoint rather than counting unread
 * items within whatever page the list happens to have fetched (which under-counts once there
 * are more unread notifications than that page's size). Same 30s poll cadence as the list.
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 30_000,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
