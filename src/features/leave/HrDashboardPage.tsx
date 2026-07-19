import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../auth/AuthContext";
import { useLeaveUtilization, useTodaySnapshot } from "../../api/hrDashboardApi";
import { parseApiError } from "../../api/errorHelpers";
import { StatCard } from "../../components/StatCard";
import { exportToCsv } from "../../utils/exportToCsv";

function SectionLoading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

function TodaySnapshotSection() {
  const { data, isLoading, isError, error } = useTodaySnapshot();

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Today&apos;s Snapshot
      </Typography>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<EventBusyIcon />}
              color="info"
              value={data.onLeaveToday}
              label="On leave today"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              icon={<PersonOffIcon />}
              color="warning"
              value={data.notClockedInToday}
              label="Not clocked in today"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Stack spacing={1}>
              <StatCard
                icon={<PendingActionsIcon />}
                color="error"
                value={data.pendingApprovalsForMe}
                label="Pending your approval"
              />
              <Button
                component={RouterLink}
                to="/app/leave/approvals"
                size="small"
                sx={{ alignSelf: "flex-start" }}
              >
                View approvals
              </Button>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
}

function LeaveUtilizationSection() {
  const theme = useTheme();
  const { data, isLoading, isError, error } = useLeaveUtilization();

  const chartData = (data ?? []).map((row) => ({
    name: row.leaveTypeName,
    value: row.averageDaysUsed,
  }));

  const handleExport = () => {
    if (!data) return;
    exportToCsv(
      `leave-utilization-${dayjs().format("YYYY-MM-DD")}.csv`,
      data,
      [
        { label: "Leave Type", value: (r) => r.leaveTypeName },
        { label: "Average Days Used", value: (r) => r.averageDaysUsed.toFixed(1) },
      ],
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" gutterBottom>
          Leave Utilization (Average Days Used)
        </Typography>
        {data && data.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        )}
      </Stack>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && data.length === 0 && (
        <Typography color="text.secondary">No active leave types yet.</Typography>
      )}

      {data && data.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="value" name="Avg days used" fill={theme.palette.primary.main} />
            </BarChart>
          </ResponsiveContainer>

          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Leave Type</TableCell>
                  <TableCell align="right">Average Days Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.leaveTypeId} hover>
                    <TableCell>{row.leaveTypeName}</TableCell>
                    <TableCell align="right">{row.averageDaysUsed.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
}

/**
 * HR overview dashboard (final Part B piece): today's snapshot stat cards plus
 * a leave utilization chart. Each section fetches independently, same pattern
 * as ReportsPage, so one slow/failing endpoint doesn't block the rest.
 */
export function HrDashboardPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        HR Dashboard — {isAdmin ? "Organization-wide" : "Your Team"}
      </Typography>

      <Grid container spacing={3}>
        <Grid size={12}>
          <TodaySnapshotSection />
        </Grid>
        <Grid size={12}>
          <LeaveUtilizationSection />
        </Grid>
      </Grid>
    </Box>
  );
}
