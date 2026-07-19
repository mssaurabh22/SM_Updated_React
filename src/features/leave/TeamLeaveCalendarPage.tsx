import { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useAuth } from "../../auth/AuthContext";
import { useEmployees } from "../../api/employeesApi";
import { useLeaveTypes } from "../../api/leaveTypesApi";
import type { LeaveRequest } from "../../api/leaveRequestsApi";
import { useTeamCalendar } from "../../api/leaveRequestsApi";
import { parseApiError } from "../../api/errorHelpers";
import { exportToCsv } from "../../utils/exportToCsv";
import { TableToolbar } from "../../components/TableToolbar";

/**
 * "Who's out and when" for the visible month - distinct from MyAttendancePage's
 * personal clock-in/out calendar. Scope (own reports vs whole org) is resolved
 * server-side by /leave-requests/team-calendar, so this page just renders
 * whatever comes back, sorted by start date.
 */
export function TeamLeaveCalendarPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const yearMonth = month.format("YYYY-MM");
  const isCurrentMonth = yearMonth === dayjs().format("YYYY-MM");

  const { data, isLoading, isError, error } = useTeamCalendar({ month: yearMonth });
  const { data: employeesPage } = useEmployees({ size: 200 });
  const { data: leaveTypes } = useLeaveTypes(true);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employeesPage?.content ?? []) map.set(emp.id, emp.fullName);
    return map;
  }, [employeesPage]);

  const leaveTypeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of leaveTypes ?? []) map.set(type.id, type.name);
    return map;
  }, [leaveTypes]);

  const requests = useMemo(
    () => [...(data ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [data],
  );

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((req) => {
      const employeeName = employeeNameById.get(req.employeeId) ?? "";
      const typeName = leaveTypeNameById.get(req.leaveTypeId) ?? "";
      return employeeName.toLowerCase().includes(term) || typeName.toLowerCase().includes(term);
    });
  }, [requests, search, employeeNameById, leaveTypeNameById]);

  const handleExport = () => {
    exportToCsv<LeaveRequest>(
      `team-leave-calendar-${yearMonth}-${dayjs().format("YYYY-MM-DD")}.csv`,
      visibleRequests,
      [
        { label: "Employee", value: (r) => employeeNameById.get(r.employeeId) ?? r.employeeId },
        { label: "Leave Type", value: (r) => leaveTypeNameById.get(r.leaveTypeId) ?? "" },
        { label: "Start", value: (r) => r.startDate },
        { label: "End", value: (r) => r.endDate },
        { label: "Days", value: (r) => r.totalDays },
      ],
    );
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Team Leave Calendar
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
        >
          <Typography variant="h6">{month.format("MMMM YYYY")}</Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              onClick={() => setMonth((m) => m.subtract(1, "month"))}
              aria-label="Previous month"
            >
              <ChevronLeftIcon />
            </IconButton>
            <Button
              size="small"
              disabled={isCurrentMonth}
              onClick={() => setMonth(dayjs().startOf("month"))}
            >
              Today
            </Button>
            <IconButton
              size="small"
              onClick={() => setMonth((m) => m.add(1, "month"))}
              aria-label="Next month"
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>
        </Stack>

        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseApiError(error).message}
          </Alert>
        )}

        {!isLoading && !isError && requests.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4 }} align="center">
            {isAdmin
              ? "No one in the organization has approved leave this month."
              : "No one on your team has approved leave this month."}
          </Typography>
        )}

        {!isLoading && !isError && requests.length > 0 && (
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search employee or leave type..."
            onExport={handleExport}
            exportDisabled={visibleRequests.length === 0}
          />
        )}

        {!isLoading && !isError && requests.length > 0 && visibleRequests.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4 }} align="center">
            No leave matches your search.
          </Typography>
        )}

        {isMobile && visibleRequests.length > 0 && (
          <Stack spacing={1.5}>
            {visibleRequests.map((req) => (
              <Card key={req.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {employeeNameById.get(req.employeeId) ?? req.employeeId}
                    </Typography>
                    <Chip
                      label={leaveTypeNameById.get(req.leaveTypeId) ?? "—"}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {req.startDate} to {req.endDate} · {req.totalDays} day
                    {req.totalDays === 1 ? "" : "s"}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {!isMobile && visibleRequests.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                  <TableCell align="right">Days</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRequests.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>{employeeNameById.get(req.employeeId) ?? req.employeeId}</TableCell>
                    <TableCell>{leaveTypeNameById.get(req.leaveTypeId) ?? "—"}</TableCell>
                    <TableCell>{req.startDate}</TableCell>
                    <TableCell>{req.endDate}</TableCell>
                    <TableCell align="right">{req.totalDays}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
