import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "./employeesApi";

export type NotificationType =
  | "LEAD_REASSIGNED"
  | "VISIT_MISSED"
  | "LEAD_LAPSED"
  | "LEAD_LAPSED_DIGEST"
  | "LEAVE_REQUEST_SUBMITTED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED";

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
