import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

export interface LeaveType {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  defaultAllocationDays: number;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLeaveTypePayload {
  name: string;
  code: string;
  defaultAllocationDays: number;
  sortOrder: number;
}

export interface UpdateLeaveTypePayload {
  name: string;
  defaultAllocationDays: number;
  sortOrder: number;
  active: boolean;
}

export async function getLeaveTypes(
  includeInactive = false,
): Promise<LeaveType[]> {
  const response = await axiosInstance.get<LeaveType[]>("/leave-types", {
    params: { includeInactive },
  });
  return response.data;
}

export async function createLeaveType(
  payload: CreateLeaveTypePayload,
): Promise<LeaveType> {
  const response = await axiosInstance.post<LeaveType>(
    "/leave-types",
    payload,
  );
  return response.data;
}

export async function updateLeaveType(
  id: string,
  payload: UpdateLeaveTypePayload,
): Promise<LeaveType> {
  const response = await axiosInstance.put<LeaveType>(
    `/leave-types/${id}`,
    payload,
  );
  return response.data;
}

export async function deactivateLeaveType(id: string): Promise<LeaveType> {
  const response = await axiosInstance.patch<LeaveType>(
    `/leave-types/${id}/deactivate`,
  );
  return response.data;
}

export function useLeaveTypes(includeInactive = false) {
  return useQuery({
    queryKey: ["leaveTypes", { includeInactive }],
    queryFn: () => getLeaveTypes(includeInactive),
  });
}

function useInvalidateLeaveTypes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
}

export function useCreateLeaveType() {
  const invalidate = useInvalidateLeaveTypes();
  return useMutation({
    mutationFn: (payload: CreateLeaveTypePayload) => createLeaveType(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateLeaveType() {
  const invalidate = useInvalidateLeaveTypes();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateLeaveTypePayload;
    }) => updateLeaveType(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeactivateLeaveType() {
  const invalidate = useInvalidateLeaveTypes();
  return useMutation({
    mutationFn: (id: string) => deactivateLeaveType(id),
    onSuccess: () => invalidate(),
  });
}
