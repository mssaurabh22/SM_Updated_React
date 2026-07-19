import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { LeaveBalance } from "./leaveBalancesApi";
import type { LeaveRequest } from "./leaveRequestsApi";
import type { AttendanceDay } from "./attendanceApi";

export interface AttendanceSummary {
  presentDays: number;
  absentDays: number;
  onLeaveDays: number;
  holidayDays: number;
  weekendDays: number;
  days: AttendanceDay[];
}

export interface EmployeeLeaveAttendanceSummary {
  balances: LeaveBalance[];
  recentRequests: LeaveRequest[];
  attendanceSummary: AttendanceSummary;
}

export interface GetEmployeeLeaveAttendanceSummaryParams {
  year?: number;
  attendanceMonth?: string;
}

export async function getEmployeeLeaveAttendanceSummary(
  employeeId: string,
  params: GetEmployeeLeaveAttendanceSummaryParams = {},
): Promise<EmployeeLeaveAttendanceSummary> {
  const response = await axiosInstance.get<EmployeeLeaveAttendanceSummary>(
    `/employees/${employeeId}/leave-attendance-summary`,
    { params },
  );
  return response.data;
}

/** Viewable by the employee themselves, their direct manager, or an ADMIN;
 * anyone else gets a 404 (information-hiding, not 403) - callers should treat
 * that like any other not-found record. */
export function useEmployeeLeaveAttendanceSummary(
  employeeId: string | null | undefined,
  params: GetEmployeeLeaveAttendanceSummaryParams = {},
) {
  return useQuery({
    queryKey: ["employeeLeaveAttendanceSummary", employeeId, params],
    queryFn: () =>
      getEmployeeLeaveAttendanceSummary(employeeId as string, params),
    enabled: !!employeeId,
  });
}
