import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKEND";

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  employeeId: string;
  attendanceDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceDay {
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
}

export async function clockIn(): Promise<AttendanceRecord> {
  const response = await axiosInstance.post<AttendanceRecord>(
    "/attendance/clock-in",
  );
  return response.data;
}

export async function clockOut(): Promise<AttendanceRecord> {
  const response = await axiosInstance.post<AttendanceRecord>(
    "/attendance/clock-out",
  );
  return response.data;
}

export async function getMyAttendance(
  yearMonth?: string,
): Promise<AttendanceDay[]> {
  const response = await axiosInstance.get<AttendanceDay[]>(
    "/attendance/mine",
    { params: { yearMonth } },
  );
  return response.data;
}

export async function getEmployeeAttendance(
  employeeId: string,
  yearMonth?: string,
): Promise<AttendanceDay[]> {
  const response = await axiosInstance.get<AttendanceDay[]>(
    `/attendance/employee/${employeeId}`,
    { params: { yearMonth } },
  );
  return response.data;
}

export function useMyAttendance(yearMonth?: string) {
  return useQuery({
    queryKey: ["attendance", "mine", { yearMonth }],
    queryFn: () => getMyAttendance(yearMonth),
  });
}

export function useEmployeeAttendance(
  employeeId: string | null | undefined,
  yearMonth?: string,
) {
  return useQuery({
    queryKey: ["attendance", "employee", employeeId, { yearMonth }],
    queryFn: () => getEmployeeAttendance(employeeId as string, yearMonth),
    enabled: !!employeeId,
  });
}

/** Clock-in/out both affect today's entry across every query shape above
 * (mine, employee, and the summary endpoint's embedded days), so invalidate
 * broadly rather than enumerating each key. */
function useInvalidateAttendance() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["attendance"] });
}

export function useClockIn() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: () => clockIn(),
    onSuccess: () => invalidate(),
  });
}

export function useClockOut() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: () => clockOut(),
    onSuccess: () => invalidate(),
  });
}
