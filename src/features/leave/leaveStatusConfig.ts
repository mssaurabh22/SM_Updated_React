import type { LeaveRequestStatus } from "../../api/leaveRequestsApi";

export const LEAVE_REQUEST_STATUSES: LeaveRequestStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

/** Human-readable labels for each leave request status, used in chips, selects, and filters. */
export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** MUI Chip colors per status, so request lists read at a glance. */
export const LEAVE_STATUS_COLORS: Record<
  LeaveRequestStatus,
  "info" | "primary" | "warning" | "error" | "success" | "default"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
};
