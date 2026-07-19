import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Container, Paper, Typography } from "@mui/material";
import { useAuth } from "./AuthContext";

/**
 * Route guard for admin-only areas. Not wired into AppRoutes yet in Phase 0 (there
 * are no admin-only pages), but is ready for later phases (e.g. Settings, Masters).
 * Same authentication check as ProtectedRoute, plus a role check on top.
 */
export function AdminRoute() {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role !== "ADMIN") {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>
            Forbidden
          </Typography>
          <Typography color="text.secondary">
            You need administrator privileges to view this page.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return <Outlet />;
}
