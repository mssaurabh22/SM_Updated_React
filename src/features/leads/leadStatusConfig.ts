import type { LeadStatus } from "../../api/leadsApi";

/** Human-readable labels for each lead status, used in chips, selects, and filters. */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  NEGOTIATION: "Negotiation",
  LOST: "Lost",
  CLOSED_WON: "Closed Won",
  LAPSED: "Lapsed",
};

/** MUI Chip colors per status, so the list/detail views read at a glance. */
export const LEAD_STATUS_COLORS: Record<
  LeadStatus,
  "info" | "primary" | "warning" | "error" | "success" | "default"
> = {
  NEW: "info",
  CONTACTED: "primary",
  NEGOTIATION: "warning",
  LOST: "error",
  CLOSED_WON: "success",
  LAPSED: "default",
};
