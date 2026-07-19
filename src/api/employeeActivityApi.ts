import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "./employeesApi";

export type EmployeeActivityType =
  | "LEAVE_REQUEST_SUBMITTED"
  | "LEAVE_REQUEST_APPROVED"
  | "LEAVE_REQUEST_REJECTED"
  | "LEAVE_REQUEST_CANCELLED";

export const EMPLOYEE_ACTIVITY_TYPES: EmployeeActivityType[] = [
  "LEAVE_REQUEST_SUBMITTED",
  "LEAVE_REQUEST_APPROVED",
  "LEAVE_REQUEST_REJECTED",
  "LEAVE_REQUEST_CANCELLED",
];

export interface EmployeeActivityEntry {
  id: string;
  employeeId: string;
  type: EmployeeActivityType;
  actorId: string | null;
  description: string;
  createdAt: string;
}

export interface GetEmployeeActivityParams {
  employeeId?: string;
  type?: EmployeeActivityType;
  page?: number;
  size?: number;
}

export async function getEmployeeActivity(
  params: GetEmployeeActivityParams = {},
): Promise<PagedResponse<EmployeeActivityEntry>> {
  const response = await axiosInstance.get<PagedResponse<EmployeeActivityEntry>>(
    "/employee-activity",
    { params },
  );
  return response.data;
}

/**
 * Non-admins are forced server-side to their own employeeId regardless of what's
 * passed here (same rule as useActivity).
 */
export function useEmployeeActivity(
  params: GetEmployeeActivityParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["employeeActivity", params],
    queryFn: () => getEmployeeActivity(params),
    enabled: options.enabled ?? true,
  });
}
