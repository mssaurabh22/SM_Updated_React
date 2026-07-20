import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import type { Notification, NotificationType } from "../api/notificationsApi";

/**
 * Shared between the Layout bell dropdown and the full Notifications page, so both render
 * identical messages/navigation for the same notification - no duplicated per-type switch logic.
 */
export interface NotificationPayload {
  leadId?: string;
  companyName?: string;
  visitId?: string;
  count?: number;
  leaveRequestId?: string;
  leaveTypeId?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export function parseNotificationPayload(
  raw: string | null,
): NotificationPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NotificationPayload;
  } catch {
    return null;
  }
}

/** Generic per-type message, enriched with details parsed from payload when available. */
export function describeNotification(notification: Notification): string {
  const payload = parseNotificationPayload(notification.payload);
  switch (notification.type) {
    case "LEAD_REASSIGNED":
      return payload?.companyName
        ? `You were assigned the lead "${payload.companyName}".`
        : "You were assigned a lead.";
    case "VISIT_MISSED":
      return payload?.companyName
        ? `A visit for "${payload.companyName}" was missed.`
        : "A scheduled visit was missed.";
    case "LEAD_LAPSED":
      return payload?.companyName
        ? `Your lead "${payload.companyName}" has lapsed - its follow-up date passed.`
        : "One of your leads has lapsed.";
    case "LEAD_LAPSED_DIGEST": {
      const count = payload?.count;
      return count
        ? `${count} of your team's lead${count === 1 ? "" : "s"} lapsed last night - review the pipeline.`
        : "Some of your team's leads lapsed last night - review the pipeline.";
    }
    case "LEAVE_REQUEST_SUBMITTED":
      return "A leave request was submitted for your approval.";
    case "LEAVE_REQUEST_APPROVED":
      return "Your leave request was approved.";
    case "LEAVE_REQUEST_REJECTED":
      return "Your leave request was rejected.";
    default:
      return "You have a new notification.";
  }
}

/** Short, human-readable label for the type filter/column - distinct from describeNotification's
 * full instance-specific message. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  LEAD_REASSIGNED: "Lead Reassigned",
  VISIT_MISSED: "Visit Missed",
  LEAD_LAPSED: "Lead Lapsed",
  LEAD_LAPSED_DIGEST: "Lead Lapsed (Digest)",
  LEAVE_REQUEST_SUBMITTED: "Leave Request Submitted",
  LEAVE_REQUEST_APPROVED: "Leave Request Approved",
  LEAVE_REQUEST_REJECTED: "Leave Request Rejected",
};

/** Icon per notification type, so the full Notifications page reads at a glance without the label. */
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, ComponentType<SvgIconProps>> = {
  LEAD_REASSIGNED: AssignmentIndIcon,
  VISIT_MISSED: ErrorIcon,
  LEAD_LAPSED: WarningAmberIcon,
  LEAD_LAPSED_DIGEST: WarningAmberIcon,
  LEAVE_REQUEST_SUBMITTED: FactCheckIcon,
  LEAVE_REQUEST_APPROVED: CheckCircleIcon,
  LEAVE_REQUEST_REJECTED: CancelIcon,
};

/** MUI chip colors per notification type, mirroring activityConfig's approach. */
export const NOTIFICATION_TYPE_COLORS: Record<
  NotificationType,
  "info" | "primary" | "warning" | "error" | "success" | "default"
> = {
  LEAD_REASSIGNED: "info",
  VISIT_MISSED: "error",
  LEAD_LAPSED: "warning",
  LEAD_LAPSED_DIGEST: "warning",
  LEAVE_REQUEST_SUBMITTED: "info",
  LEAVE_REQUEST_APPROVED: "success",
  LEAVE_REQUEST_REJECTED: "error",
};

/** Where clicking a notification should navigate to, or null if there's nowhere sensible to go. */
export function getNotificationTarget(notification: Notification): string | null {
  const payload = parseNotificationPayload(notification.payload);
  if (payload?.leadId) {
    return `/app/leads/${payload.leadId}`;
  }
  if (notification.type === "LEAD_LAPSED_DIGEST") {
    return "/app/leads?status=LAPSED";
  }
  if (notification.type === "LEAVE_REQUEST_SUBMITTED") {
    return "/app/leave/approvals";
  }
  if (notification.type === "LEAVE_REQUEST_APPROVED" || notification.type === "LEAVE_REQUEST_REJECTED") {
    return "/app/leave";
  }
  return null;
}
