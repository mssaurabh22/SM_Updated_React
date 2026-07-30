import type { ComponentType } from "react";
import type { SvgIconProps } from "@mui/material";
import dayjs from "dayjs";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import type { Notification, NotificationType } from "../api/notificationsApi";
import type { FeatureEntitlement } from "../api/entitlementApi";

/**
 * Shared between the Layout bell dropdown and the full Notifications page, so both render
 * identical messages/navigation for the same notification - no duplicated per-type switch logic.
 */
export interface NotificationPayload {
  leadId?: string;
  companyName?: string;
  visitId?: string;
  visitDate?: string;
  scheduledTime?: string;
  nextFollowupDate?: string;
  reassignedByName?: string;
  count?: number;
  leaveRequestId?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
  productId?: string;
  productName?: string;
  stockQuantity?: number;
  [key: string]: unknown;
}

/** "22 Jul" - "24 Jul 2026" (only one date, no range) if startDate === endDate. */
function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate || !endDate) return null;
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (!start.isValid() || !end.isValid()) return null;
  if (start.isSame(end, "day")) return start.format("DD MMM YYYY");
  return `${start.format("DD MMM")} - ${end.format("DD MMM YYYY")}`;
}

/** "21 Jul, 06:00 AM" if a scheduled time is present, else just "21 Jul". */
function formatVisitWhen(visitDate?: string, scheduledTime?: string): string | null {
  if (!visitDate) return null;
  const date = dayjs(visitDate);
  if (!date.isValid()) return null;
  if (!scheduledTime) return date.format("DD MMM");
  const time = dayjs(scheduledTime, ["HH:mm:ss", "HH:mm"]);
  return time.isValid() ? `${date.format("DD MMM")}, ${time.format("hh:mm A")}` : date.format("DD MMM");
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
    case "LEAD_REASSIGNED": {
      const who = payload?.reassignedByName;
      if (!payload?.companyName) return "You were assigned a lead.";
      return who
        ? `${who} assigned you the lead "${payload.companyName}".`
        : `You were assigned the lead "${payload.companyName}".`;
    }
    case "VISIT_MISSED": {
      const when = formatVisitWhen(payload?.visitDate, payload?.scheduledTime);
      if (!payload?.companyName) return "A scheduled visit was missed.";
      return when
        ? `A visit for "${payload.companyName}" scheduled on ${when} was missed.`
        : `A visit for "${payload.companyName}" was missed.`;
    }
    case "LEAD_LAPSED": {
      const followupDate = payload?.nextFollowupDate ? dayjs(payload.nextFollowupDate) : null;
      const formattedDate = followupDate?.isValid() ? followupDate.format("DD MMM YYYY") : null;
      if (!payload?.companyName) return "One of your leads has lapsed.";
      return formattedDate
        ? `Your lead "${payload.companyName}" has lapsed - its follow-up date (${formattedDate}) passed.`
        : `Your lead "${payload.companyName}" has lapsed - its follow-up date passed.`;
    }
    case "LEAD_LAPSED_DIGEST": {
      const count = payload?.count;
      return count
        ? `${count} of your team's lead${count === 1 ? "" : "s"} lapsed last night - review the pipeline.`
        : "Some of your team's leads lapsed last night - review the pipeline.";
    }
    case "LEAVE_REQUEST_SUBMITTED": {
      const who = payload?.employeeName ?? "An employee";
      const type = payload?.leaveTypeName ?? "leave";
      const range = formatDateRange(payload?.startDate, payload?.endDate);
      return range
        ? `${who} requested ${type} (${range}) - awaiting your approval.`
        : `${who} requested ${type} - awaiting your approval.`;
    }
    case "LEAVE_REQUEST_APPROVED": {
      const type = payload?.leaveTypeName ?? "leave";
      const range = formatDateRange(payload?.startDate, payload?.endDate);
      return range
        ? `Your ${type} request (${range}) was approved.`
        : `Your ${type} request was approved.`;
    }
    case "LEAVE_REQUEST_REJECTED": {
      const type = payload?.leaveTypeName ?? "leave";
      const range = formatDateRange(payload?.startDate, payload?.endDate);
      return range
        ? `Your ${type} request (${range}) was rejected.`
        : `Your ${type} request was rejected.`;
    }
    case "LOW_STOCK":
      return payload?.productName
        ? `"${payload.productName}" is running low on stock (${payload.stockQuantity ?? "?"} left).`
        : "A product is running low on stock.";
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
  LOW_STOCK: "Low Stock",
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
  LOW_STOCK: Inventory2Icon,
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
  LOW_STOCK: "warning",
};

/** Which entitlement (if any) a notification type belongs to - LEAVE_REQUEST_* only exist
 * because EMPLOYEE_LEAVE_MANAGEMENT was on when they were created, LOW_STOCK because
 * INVENTORY_MANAGEMENT was; both endpoints that would have generated NEW ones are already
 * blocked server-side once the entitlement is off, so this only ever hides historical
 * notifications from back when the feature was still licensed. Types with no entry here
 * (Lead/Visit lifecycle events) are core, never entitlement-gated. */
const NOTIFICATION_TYPE_ENTITLEMENT: Partial<Record<NotificationType, FeatureEntitlement>> = {
  LEAVE_REQUEST_SUBMITTED: "EMPLOYEE_LEAVE_MANAGEMENT",
  LEAVE_REQUEST_APPROVED: "EMPLOYEE_LEAVE_MANAGEMENT",
  LEAVE_REQUEST_REJECTED: "EMPLOYEE_LEAVE_MANAGEMENT",
  LOW_STOCK: "INVENTORY_MANAGEMENT",
};

/** False for a notification whose feature is no longer licensed - its target route/nav item is
 * already hidden/blocked elsewhere in the app, so clicking through would only dead-end on a
 * "Forbidden" page. The bell dropdown and the full Notifications page both filter on this
 * before rendering, rather than showing a notification with nowhere valid to go. */
export function isNotificationVisible(
  notification: Notification,
  hasEntitlement: (code: FeatureEntitlement) => boolean,
): boolean {
  const required = NOTIFICATION_TYPE_ENTITLEMENT[notification.type];
  return !required || hasEntitlement(required);
}

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
  if (notification.type === "LOW_STOCK") {
    return "/app/inventory/products";
  }
  return null;
}
