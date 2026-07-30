import { useMemo } from "react";
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useAuth } from "../../auth/AuthContext";
import { useEmployees } from "../../api/employeesApi";
import { useMasterData } from "../../api/masterDataApi";
import { parseApiError } from "../../api/errorHelpers";
import { buildForest, findNode, OrgChartNode } from "./orgTree";

/**
 * "Who reports to me" for any employee - not just Admins. GET /employees has always been open
 * to every authenticated employee (no @PreAuthorize, no entitlement check - see
 * EmployeeController's own javadoc), so this isn't a new visibility grant, just a UI for data a
 * manager could already fetch raw from the API; that's also why it's reachable without the
 * TEAM_VISIBILITY entitlement OrgChartPage's ADMIN-only counterpart doesn't need either. Shows
 * only the caller's own subtree (built via the same buildForest as OrgChartPage, then pulled
 * out with findNode) rather than the whole org.
 */
export function MyTeamPage() {
  const { employeeId } = useAuth();
  const { data, isLoading, isError, error } = useEmployees({ size: 500 });
  const { data: designations } = useMasterData("DESIGNATION");

  const designationLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of designations ?? []) map.set(item.id, item.label);
    return map;
  }, [designations]);

  const myNode = useMemo(() => {
    if (!data || !employeeId) return null;
    const forest = buildForest(data.content);
    return findNode(forest, employeeId);
  }, [data, employeeId]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        My Team
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Everyone who reports to you, directly or through another manager.
      </Typography>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && myNode && myNode.children.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Typography color="text.secondary" align="center">
            No one reports to you yet.
          </Typography>
        </Paper>
      )}

      {myNode && myNode.children.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, overflowX: "auto" }}>
          <OrgChartNode node={myNode} designationLabelById={designationLabelById} isLast highlight />
        </Paper>
      )}
    </Box>
  );
}
