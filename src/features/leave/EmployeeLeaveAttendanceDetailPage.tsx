import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useEmployee } from "../../api/employeesApi";
import { useLeaveTypes } from "../../api/leaveTypesApi";
import type { LeaveRequest } from "../../api/leaveRequestsApi";
import { useEmployeeLeaveAttendanceSummary } from "../../api/employeeSummaryApi";
import { parseApiError } from "../../api/errorHelpers";
import { exportToCsv } from "../../utils/exportToCsv";
import { TableToolbar } from "../../components/TableToolbar";
import { LeaveBalanceCards } from "./LeaveBalanceCards";
import { AttendanceCalendarGrid } from "./AttendanceCalendarGrid";
import { LEAVE_STATUS_COLORS, LEAVE_STATUS_LABELS } from "./leaveStatusConfig";

function AttendanceStat({ label, value }: { label: string; value: number }) {
  return (
    <Box>
      <Typography variant="h6">{value}</Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/**
 * "Everything about one employee's leave & attendance" view - reached today
 * only from Leave Approvals' "Pending My Approval" tab. Access is enforced
 * server-side (employee themselves, their manager, or an ADMIN); anyone else
 * gets a 404, surfaced here as a plain not-found state rather than anything
 * that leaks whether the employee/record exists.
 */
export function EmployeeLeaveAttendanceDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { data: employee } = useEmployee(employeeId);
  const { data: leaveTypes } = useLeaveTypes(true);
  const { data: summary, isLoading, isError, error } =
    useEmployeeLeaveAttendanceSummary(employeeId);
  const [search, setSearch] = useState("");

  const leaveTypeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of leaveTypes ?? []) map.set(type.id, type.name);
    return map;
  }, [leaveTypes]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !summary) {
    const parsed = error ? parseApiError(error) : null;
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity={parsed && parsed.status === 404 ? "info" : "error"}>
          {parsed && parsed.status === 404
            ? "This employee's leave & attendance details aren't available to you."
            : (parsed?.message ?? "Not found.")}
        </Alert>
      </Box>
    );
  }

  const { balances, recentRequests, attendanceSummary } = summary;

  const visibleRequests = (() => {
    const term = search.trim().toLowerCase();
    if (!term) return recentRequests;
    return recentRequests.filter((req) =>
      (leaveTypeNameById.get(req.leaveTypeId) ?? "").toLowerCase().includes(term),
    );
  })();

  const handleExport = () => {
    exportToCsv<LeaveRequest>(
      `leave-requests-${employee?.fullName ?? "employee"}-${dayjs().format("YYYY-MM-DD")}.csv`,
      visibleRequests,
      [
        { label: "Leave Type", value: (r) => leaveTypeNameById.get(r.leaveTypeId) ?? "" },
        { label: "Start", value: (r) => r.startDate },
        { label: "End", value: (r) => r.endDate },
        { label: "Days", value: (r) => r.totalDays },
        { label: "Status", value: (r) => LEAVE_STATUS_LABELS[r.status] },
        { label: "Reason", value: (r) => r.reason },
      ],
    );
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>

      <Typography variant="h5" sx={{ mb: 2 }}>
        {employee?.fullName ?? "Employee"} · Leave &amp; Attendance
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Leave Balances
        </Typography>
        {balances.length === 0 ? (
          <Typography color="text.secondary">No leave balances configured.</Typography>
        ) : (
          <LeaveBalanceCards balances={balances} />
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Recent Leave Requests
        </Typography>

        {recentRequests.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No leave requests yet.
          </Typography>
        )}

        {recentRequests.length > 0 && (
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search leave type..."
            onExport={handleExport}
            exportDisabled={visibleRequests.length === 0}
          />
        )}

        {recentRequests.length > 0 && visibleRequests.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No leave requests match your search.
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
                      {leaveTypeNameById.get(req.leaveTypeId) ?? "—"}
                    </Typography>
                    <Chip
                      label={LEAVE_STATUS_LABELS[req.status]}
                      color={LEAVE_STATUS_COLORS[req.status]}
                      size="small"
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {req.startDate} to {req.endDate} · {req.totalDays} day
                    {req.totalDays === 1 ? "" : "s"}
                  </Typography>
                  {req.reason && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {req.reason}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        {!isMobile && visibleRequests.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                  <TableCell align="right">Days</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRequests.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>{leaveTypeNameById.get(req.leaveTypeId) ?? "—"}</TableCell>
                    <TableCell>{req.startDate}</TableCell>
                    <TableCell>{req.endDate}</TableCell>
                    <TableCell align="right">{req.totalDays}</TableCell>
                    <TableCell>
                      <Chip
                        label={LEAVE_STATUS_LABELS[req.status]}
                        color={LEAVE_STATUS_COLORS[req.status]}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Attendance This Month
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <AttendanceStat label="Present" value={attendanceSummary.presentDays} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <AttendanceStat label="Absent" value={attendanceSummary.absentDays} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <AttendanceStat label="On Leave" value={attendanceSummary.onLeaveDays} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <AttendanceStat label="Holidays" value={attendanceSummary.holidayDays} />
          </Grid>
          <Grid size={{ xs: 6, sm: 2.4 }}>
            <AttendanceStat label="Weekends" value={attendanceSummary.weekendDays} />
          </Grid>
        </Grid>

        <AttendanceCalendarGrid days={attendanceSummary.days} />
      </Paper>
    </Box>
  );
}
