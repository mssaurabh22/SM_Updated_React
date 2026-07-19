import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

export interface Holiday {
  id: string;
  organizationId: string;
  name: string;
  /** ISO date string, e.g. "2026-01-26". */
  holidayDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHolidayPayload {
  name: string;
  holidayDate: string;
}

export async function getHolidays(year?: number): Promise<Holiday[]> {
  const response = await axiosInstance.get<Holiday[]>("/holidays", {
    params: { year },
  });
  return response.data;
}

export async function createHoliday(
  payload: CreateHolidayPayload,
): Promise<Holiday> {
  const response = await axiosInstance.post<Holiday>("/holidays", payload);
  return response.data;
}

export async function deleteHoliday(id: string): Promise<void> {
  await axiosInstance.delete(`/holidays/${id}`);
}

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: ["holidays", { year }],
    queryFn: () => getHolidays(year),
  });
}

function useInvalidateHolidays() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["holidays"] });
}

export function useCreateHoliday() {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: (payload: CreateHolidayPayload) => createHoliday(payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteHoliday() {
  const invalidate = useInvalidateHolidays();
  return useMutation({
    mutationFn: (id: string) => deleteHoliday(id),
    onSuccess: () => invalidate(),
  });
}
