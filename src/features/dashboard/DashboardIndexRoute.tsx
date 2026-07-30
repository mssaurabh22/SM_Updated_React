import { useAuth } from "../../auth/AuthContext";
import { useEntitlements } from "../../entitlement/EntitlementContext";
import { DashboardPage } from "./DashboardPage";
import { TodaysFollowUpsPage } from "./TodaysFollowUpsPage";

/**
 * The /app index route's content depends on role, mirroring TeamVisibilityRoute's exact access
 * rule for /app/reports: an ADMIN or a manager with TEAM_VISIBILITY entitled gets the org-wide
 * Dashboard (it reuses the same reporting endpoints ReportsPage does, which 403 for anyone else
 * - see ReportingService#resolveOwnerScope on the backend). A plain EMPLOYEE keeps seeing their
 * personal Today's Follow-ups agenda, same as before this Dashboard existed - org-wide charts
 * wouldn't be accessible (or meaningful) for them anyway.
 */
export function DashboardIndexRoute() {
  const { role } = useAuth();
  const { hasEntitlement, isLoading } = useEntitlements();

  if (role === "ADMIN") {
    return <DashboardPage />;
  }
  if (isLoading) {
    return null;
  }
  return hasEntitlement("TEAM_VISIBILITY") ? <DashboardPage /> : <TodaysFollowUpsPage />;
}
