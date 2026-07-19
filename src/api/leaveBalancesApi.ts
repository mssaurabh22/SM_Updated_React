import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  allocatedDays: number;
  carriedForwardDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface SetLeaveBalanceAllocationPayload {
  allocatedDays: number;
  carriedForwardDays: number;
}

export async function getMyLeaveBalances(
  year?: number,
): Promise<LeaveBalance[]> {
  const response = await axiosInstance.get<LeaveBalance[]>(
    "/leave-balances/mine",
    { params: { year } },
  );
  return response.data;
}

export async function getEmployeeLeaveBalances(
  employeeId: string,
  year?: number,
): Promise<LeaveBalance[]> {
  const response = await axiosInstance.get<LeaveBalance[]>(
    `/leave-balances/employee/${employeeId}`,
    { params: { year } },
  );
  return response.data;
}

export async function setLeaveBalanceAllocation(
  employeeId: string,
  leaveTypeId: string,
  payload: SetLeaveBalanceAllocationPayload,
  year?: number,
): Promise<LeaveBalance[]> {
  const response = await axiosInstance.put<LeaveBalance[]>(
    `/leave-balances/employee/${employeeId}/leave-type/${leaveTypeId}`,
    payload,
    { params: { year } },
  );
  return response.data;
}

export function useMyLeaveBalances(year?: number) {
  return useQuery({
    queryKey: ["leaveBalances", "mine", { year }],
    queryFn: () => getMyLeaveBalances(year),
  });
}

export function useEmployeeLeaveBalances(
  employeeId: string | null | undefined,
  year?: number,
) {
  return useQuery({
    queryKey: ["leaveBalances", "employee", employeeId, { year }],
    queryFn: () => getEmployeeLeaveBalances(employeeId as string, year),
    enabled: !!employeeId,
  });
}

export function useSetLeaveBalanceAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      leaveTypeId,
      payload,
      year,
    }: {
      employeeId: string;
      leaveTypeId: string;
      payload: SetLeaveBalanceAllocationPayload;
      year?: number;
    }) => setLeaveBalanceAllocation(employeeId, leaveTypeId, payload, year),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leaveBalances", "mine"] });
      queryClient.invalidateQueries({
        queryKey: ["leaveBalances", "employee", variables.employeeId],
      });
    },
  });
}
