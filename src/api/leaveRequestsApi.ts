import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";
import type { PagedResponse } from "./employeesApi";

export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface LeaveRequest {
  id: string;
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  status: LeaveRequestStatus;
  approverId: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveRequestPayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface DecisionPayload {
  decisionNote?: string;
}

export interface GetMyLeaveRequestsParams {
  status?: LeaveRequestStatus;
  page?: number;
  size?: number;
}

export interface GetAllLeaveRequestsParams {
  employeeId?: string;
  status?: LeaveRequestStatus;
  leaveTypeId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  page?: number;
  size?: number;
}

export interface TeamCalendarParams {
  /** "YYYY-MM"; defaults to the current month server-side if omitted. */
  month?: string;
}

export async function createLeaveRequest(
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequest> {
  const response = await axiosInstance.post<LeaveRequest>(
    "/leave-requests",
    payload,
  );
  return response.data;
}

export async function getMyLeaveRequests(
  params: GetMyLeaveRequestsParams = {},
): Promise<PagedResponse<LeaveRequest>> {
  const response = await axiosInstance.get<PagedResponse<LeaveRequest>>(
    "/leave-requests/mine",
    { params },
  );
  return response.data;
}

export async function getPendingApproval(): Promise<LeaveRequest[]> {
  const response = await axiosInstance.get<LeaveRequest[]>(
    "/leave-requests/pending-approval",
  );
  return response.data;
}

export async function getAllLeaveRequests(
  params: GetAllLeaveRequestsParams = {},
): Promise<PagedResponse<LeaveRequest>> {
  const response = await axiosInstance.get<PagedResponse<LeaveRequest>>(
    "/leave-requests",
    { params },
  );
  return response.data;
}

/** Scoped server-side: ADMIN gets the whole org's approved leave for the
 * month, anyone else gets their direct+indirect reports' only (empty for an
 * individual contributor with no reports). Every row here is APPROVED. */
export async function getTeamCalendar(
  params: TeamCalendarParams = {},
): Promise<LeaveRequest[]> {
  const response = await axiosInstance.get<LeaveRequest[]>(
    "/leave-requests/team-calendar",
    { params },
  );
  return response.data;
}

export async function approveLeaveRequest(
  id: string,
  payload: DecisionPayload = {},
): Promise<LeaveRequest> {
  const response = await axiosInstance.patch<LeaveRequest>(
    `/leave-requests/${id}/approve`,
    payload,
  );
  return response.data;
}

export async function rejectLeaveRequest(
  id: string,
  payload: DecisionPayload = {},
): Promise<LeaveRequest> {
  const response = await axiosInstance.patch<LeaveRequest>(
    `/leave-requests/${id}/reject`,
    payload,
  );
  return response.data;
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const response = await axiosInstance.patch<LeaveRequest>(
    `/leave-requests/${id}/cancel`,
  );
  return response.data;
}

export function useMyLeaveRequests(params: GetMyLeaveRequestsParams = {}) {
  return useQuery({
    queryKey: ["leaveRequests", "mine", params],
    queryFn: () => getMyLeaveRequests(params),
  });
}

export function usePendingApproval() {
  return useQuery({
    queryKey: ["leaveRequests", "pendingApproval"],
    queryFn: () => getPendingApproval(),
  });
}

export function useAllLeaveRequests(params: GetAllLeaveRequestsParams = {}) {
  return useQuery({
    queryKey: ["leaveRequests", "all", params],
    queryFn: () => getAllLeaveRequests(params),
  });
}

export function useTeamCalendar(params: TeamCalendarParams = {}) {
  return useQuery({
    queryKey: ["leaveRequests", "teamCalendar", params],
    queryFn: () => getTeamCalendar(params),
  });
}

/** Every mutation here changes computed used/remaining days, so both prefixes
 * are invalidated together rather than duplicating this in each hook. */
function useInvalidateLeaveRequests() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
    queryClient.invalidateQueries({ queryKey: ["leaveBalances"] });
  };
}

export function useCreateLeaveRequest() {
  const invalidate = useInvalidateLeaveRequests();
  return useMutation({
    mutationFn: (payload: CreateLeaveRequestPayload) =>
      createLeaveRequest(payload),
    onSuccess: () => invalidate(),
  });
}

export function useApproveLeaveRequest() {
  const invalidate = useInvalidateLeaveRequests();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: DecisionPayload;
    }) => approveLeaveRequest(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useRejectLeaveRequest() {
  const invalidate = useInvalidateLeaveRequests();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: DecisionPayload;
    }) => rejectLeaveRequest(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useCancelLeaveRequest() {
  const invalidate = useInvalidateLeaveRequests();
  return useMutation({
    mutationFn: (id: string) => cancelLeaveRequest(id),
    onSuccess: () => invalidate(),
  });
}
