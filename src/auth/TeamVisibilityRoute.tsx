import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Container, Paper, Typography } from "@mui/material";
import { useAuth } from "./AuthContext";
import { useEntitlements } from "../entitlement/EntitlementContext";

/**
 * Route guard for pages that used to be strictly ADMIN-only (Reports) but are now also
 * reachable by a manager once TEAM_VISIBILITY is entitled - see
 * EmployeeHierarchyService#getTeamVisibilityScope on the backend. Deliberately does NOT try to
 * pre-check "does this employee actually have any subordinates" client-side (there's no cheap
 * way to know that without an extra request) - an EMPLOYEE with the entitlement but no
 * subordinates still reaches the page, and each section's existing per-query error handling
 * (see ReportsPage) shows the backend's 403 as a normal error alert instead of a page-level
 * block. Same authentication check as ProtectedRoute/AdminRoute.
 */
export function TeamVisibilityRoute() {
  const { isAuthenticated, role } = useAuth();
  const { hasEntitlement, isLoading } = useEntitlements();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role === "ADMIN") {
    return <Outlet />;
  }

  if (isLoading) {
    return null;
  }

  if (!hasEntitlement("TEAM_VISIBILITY")) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Forbidden
          </Typography>
          <Typography color="text.secondary">
            You need administrator privileges (or manager team-visibility access) to view this
            page.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return <Outlet />;
}
