import type { AttendanceStatus } from "../../api/attendanceApi";

/** Human-readable labels for each attendance day status, used in calendar cells. */
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
  HOLIDAY: "Holiday",
  WEEKEND: "Weekend",
};

/** MUI color per status, so a month calendar reads at a glance. */
export const ATTENDANCE_STATUS_COLORS: Record<
  AttendanceStatus,
  "info" | "warning" | "error" | "success" | "default"
> = {
  PRESENT: "success",
  ABSENT: "error",
  ON_LEAVE: "info",
  HOLIDAY: "warning",
  WEEKEND: "default",
};
