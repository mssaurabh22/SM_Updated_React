import { useMemo } from "react";
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { useEmployees } from "../../api/employeesApi";
import { useMasterData } from "../../api/masterDataApi";
import { parseApiError } from "../../api/errorHelpers";
import { buildForest, OrgChartNode } from "./orgTree";

/**
 * Admin-only "who reports to whom" tree, built entirely client-side from the same
 * Employee#managerId field EmployeeHierarchyService already uses server-side for
 * TEAM_VISIBILITY scoping - no new backend endpoint needed, this is purely a different
 * presentation of data that already exists. Employees with no manager (or a manager not found
 * in this list) render as separate top-level trees rather than being hidden. See MyTeamPage for
 * the non-admin, "just my own subtree" counterpart.
 */
export function OrgChartPage() {
  const { data, isLoading, isError, error } = useEmployees({ size: 500 });
  const { data: designations } = useMasterData("DESIGNATION");

  const designationLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of designations ?? []) map.set(item.id, item.label);
    return map;
  }, [designations]);

  const forest = useMemo(() => buildForest(data?.content ?? []), [data]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Organization Structure
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Reporting hierarchy, based on each employee's assigned manager.
      </Typography>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && forest.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Typography color="text.secondary" align="center">
            No employees yet.
          </Typography>
        </Paper>
      )}

      {forest.length > 0 && (
        <Paper variant="outlined" sx={{ p: 3, overflowX: "auto" }}>
          <Stack spacing={3}>
            {forest.map((root) => (
              <OrgChartNode
                key={root.employee.id}
                node={root}
                designationLabelById={designationLabelById}
                isLast
              />
            ))}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
