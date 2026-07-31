import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

export type CalendarProvider = "GOOGLE" | "OUTLOOK";

export interface CalendarConnectionStatus {
  connected: boolean;
  provider: CalendarProvider | null;
  connectedAt: string | null;
  lastSyncError: string | null;
}

export const CALENDAR_CONNECTION_QUERY_KEY = ["calendarConnection", "me"];

export async function getCalendarConnectionStatus(): Promise<CalendarConnectionStatus> {
  const response = await axiosInstance.get<CalendarConnectionStatus>("/calendar-connections/me");
  return response.data;
}

export function useCalendarConnectionStatus(enabled: boolean) {
  return useQuery({
    queryKey: CALENDAR_CONNECTION_QUERY_KEY,
    queryFn: getCalendarConnectionStatus,
    enabled,
  });
}

/** Returns the provider's own consent-screen URL - the caller does
 * `window.location.href = url` itself (a full-page OAuth redirect, not something
 * axios/fetch can drive), see CalendarConnectionSection. */
export async function getAuthorizeUrl(provider: CalendarProvider): Promise<string> {
  const response = await axiosInstance.get<{ url: string }>(
    `/calendar-connections/${provider}/authorize-url`,
  );
  return response.data.url;
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await axiosInstance.delete("/calendar-connections/me");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_CONNECTION_QUERY_KEY });
    },
  });
}
