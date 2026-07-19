import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Container, Paper, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { useEntitlements } from "./EntitlementContext";
import type { FeatureEntitlement } from "../api/entitlementApi";

interface RequireEntitlementRouteProps {
  feature: FeatureEntitlement;
}

/**
 * Route guard for a licensed/gated feature area - not wired into any route yet
 * (no gated pages exist until Part B, the Leave/Attendance module, is built),
 * but ready for it. Mirrors AdminRoute's structure exactly, checking
 * entitlement instead of role. Shows an "upgrade" message rather than a bare
 * permission error, matching the backend's distinct FEATURE_NOT_ENTITLED
 * error code for the same distinction.
 */
export function RequireEntitlementRoute({ feature }: RequireEntitlementRouteProps) {
  const { isAuthenticated } = useAuth();
  const { hasEntitlement, isLoading } = useEntitlements();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isLoading) {
    return null;
  }

  if (!hasEntitlement(feature)) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Not available on your plan
          </Typography>
          <Typography color="text.secondary">
            This feature isn't enabled for your organization. Contact your
            account manager to enable it.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return <Outlet />;
}
