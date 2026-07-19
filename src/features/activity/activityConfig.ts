import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { ActivityType } from "../../api/activityApi";

/** Human-readable labels for each activity type, used in chips, selects, and filters. */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  LEAD_CREATED: "Lead Created",
  LEAD_STATUS_CHANGED: "Status Changed",
  LEAD_REASSIGNED: "Reassigned",
  VISIT_LOGGED: "Visit Logged",
  VISIT_COMPLETED: "Visit Completed",
  VISIT_MISSED: "Visit Missed",
  LEAD_LAPSED: "Lead Lapsed",
};

/** Icon per activity type, so a timeline reads at a glance without the label. */
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, ComponentType<SvgIconProps>> = {
  LEAD_CREATED: AddCircleIcon,
  LEAD_STATUS_CHANGED: SwapHorizIcon,
  LEAD_REASSIGNED: AssignmentIndIcon,
  VISIT_LOGGED: EventIcon,
  VISIT_COMPLETED: CheckCircleIcon,
  VISIT_MISSED: ErrorIcon,
  LEAD_LAPSED: WarningAmberIcon,
};

/** MUI icon/chip colors per activity type, mirroring leadStatusConfig's approach. */
export const ACTIVITY_TYPE_COLORS: Record<
  ActivityType,
  "info" | "primary" | "warning" | "error" | "success" | "default"
> = {
  LEAD_CREATED: "success",
  LEAD_STATUS_CHANGED: "primary",
  LEAD_REASSIGNED: "info",
  VISIT_LOGGED: "info",
  VISIT_COMPLETED: "success",
  VISIT_MISSED: "error",
  LEAD_LAPSED: "warning",
};

/** "System" for job-generated entries (e.g. LEAD_LAPSED), else the resolved employee name. */
export function resolveActorName(
  actorId: string | null,
  employeeNameById: Map<string, string>,
): string {
  if (!actorId) return "System";
  return employeeNameById.get(actorId) ?? actorId;
}
