import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

export interface HrDashboardSnapshot {
  onLeaveToday: number;
  notClockedInToday: number;
  pendingApprovalsForMe: number;
}

export interface LeaveUtilization {
  leaveTypeId: string;
  leaveTypeName: string;
  averageDaysUsed: number;
}

/** onLeaveToday/notClockedInToday scoped like the team calendar (ADMIN -> org-wide,
 * else -> the caller's subordinate chain); pendingApprovalsForMe is always the
 * caller's own approval inbox count, regardless of scope. */
export async function getTodaySnapshot(): Promise<HrDashboardSnapshot> {
  const response = await axiosInstance.get<HrDashboardSnapshot>(
    "/hr-dashboard/today-snapshot",
  );
  return response.data;
}

export async function getLeaveUtilization(
  year?: number,
): Promise<LeaveUtilization[]> {
  const response = await axiosInstance.get<LeaveUtilization[]>(
    "/hr-dashboard/leave-utilization",
    { params: { year } },
  );
  return response.data;
}

export function useTodaySnapshot() {
  return useQuery({
    queryKey: ["hrDashboard", "todaySnapshot"],
    queryFn: () => getTodaySnapshot(),
  });
}

export function useLeaveUtilization(year?: number) {
  return useQuery({
    queryKey: ["hrDashboard", "leaveUtilization", { year }],
    queryFn: () => getLeaveUtilization(year),
  });
}
