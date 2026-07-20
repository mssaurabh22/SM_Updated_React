import { useMemo, useState } from "react";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
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
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LEAD_STATUSES } from "../../api/leadsApi";
import type { LeadStatus } from "../../api/leadsApi";
import {
  useConversionRate,
  usePipelineSummary,
  useVisitsCompletedVsMissed,
} from "../../api/reportingApi";
import { parseApiError } from "../../api/errorHelpers";
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from "../leads/leadStatusConfig";
import { StatCard } from "../../components/StatCard";
import { exportToCsv } from "../../utils/exportToCsv";

/**
 * Maps the app-wide MUI Chip color names used for lead statuses (defined once in
 * leadStatusConfig.ts) to actual hex values from the active theme, so the pipeline
 * pie chart uses exactly the same status-color scheme as the rest of the app
 * (lead list/detail chips) rather than a second, independently invented palette.
 */
function useLeadStatusHexColors(): Record<LeadStatus, string> {
  const theme = useTheme();
  return useMemo(() => {
    const chipColorToHex: Record<string, string> = {
      info: theme.palette.info.main,
      primary: theme.palette.primary.main,
      warning: theme.palette.warning.main,
      error: theme.palette.error.main,
      success: theme.palette.success.main,
      default: theme.palette.grey[500],
    };
    const result = {} as Record<LeadStatus, string>;
    for (const status of LEAD_STATUSES) {
      result[status] = chipColorToHex[LEAD_STATUS_COLORS[status]];
    }
    return result;
  }, [theme]);
}

function SectionLoading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

function PipelineSummarySection() {
  const { data, isLoading, isError, error } = usePipelineSummary();
  const statusColors = useLeadStatusHexColors();

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Pipeline Summary
      </Typography>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <>
          <Box sx={{ mb: 2 }}>
            <StatCard
              icon={<GroupsIcon />}
              color="primary"
              value={data.totalLeads}
              label="Total leads"
            />
          </Box>

          {data.totalLeads === 0 ? (
            <Typography color="text.secondary">No leads yet.</Typography>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={LEAD_STATUSES.map((status) => ({
                    name: LEAD_STATUS_LABELS[status],
                    value: data.byStatus[status] ?? 0,
                    status,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  // Zero-value slices have no arc, so their label anchors collapse to the
                  // same point and overlap illegibly - only label slices that actually
                  // render (the Legend below still lists every status regardless).
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
                >
                  {LEAD_STATUSES.map((status) => (
                    <Cell key={status} fill={statusColors[status]} />
                  ))}
                </Pie>
                <Legend />
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </>
      )}
    </Paper>
  );
}

function ConversionRateSection() {
  const { data, isLoading, isError, error } = useConversionRate();

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Conversion Rate
      </Typography>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <Stack spacing={2} sx={{ py: 1 }}>
          <StatCard
            icon={<EmojiEventsIcon />}
            color="success"
            value={`${data.conversionRatePercent.toFixed(2)}%`}
            label={`${data.closedWonCount} closed-won of ${data.totalLeads} leads`}
          />
          <Typography color="text.secondary">
            {data.lostCount} lost
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}

function VisitsCompletedVsMissedSection() {
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
  const [dateTo, setDateTo] = useState<Dayjs | null>(null);
  const theme = useTheme();

  const { data, isLoading, isError, error } = useVisitsCompletedVsMissed(
    dateFrom ? dateFrom.format("YYYY-MM-DD") : undefined,
    dateTo ? dateTo.format("YYYY-MM-DD") : undefined,
  );

  const chartData = data
    ? [
        { name: "Completed", value: data.completed, key: "completed" },
        { name: "Missed", value: data.missed, key: "missed" },
        { name: "Planned", value: data.planned, key: "planned" },
      ]
    : [];

  const barColors: Record<string, string> = {
    completed: theme.palette.success.main,
    missed: theme.palette.error.main,
    planned: theme.palette.info.main,
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Visits Completed vs Missed
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <DatePicker
          label="From"
          value={dateFrom}
          onChange={setDateFrom}
          slotProps={{ textField: { fullWidth: true, size: "small" } }}
        />
        <DatePicker
          label="To"
          value={dateTo}
          onChange={setDateTo}
          slotProps={{ textField: { fullWidth: true, size: "small" } }}
        />
      </Stack>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <>
          <Box sx={{ mb: 2 }}>
            <StatCard
              icon={<EventAvailableIcon />}
              color="success"
              value={`${data.completionRatePercent.toFixed(2)}%`}
              label={`${data.completed} completed, ${data.missed} missed`}
            />
          </Box>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="value" name="Visits">
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={barColors[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </Paper>
  );
}

function OwnerBreakdownSection() {
  const { data, isLoading, isError, error } = usePipelineSummary();

  const handleExport = () => {
    if (!data) return;
    exportToCsv(
      `per-salesperson-breakdown-${dayjs().format("YYYY-MM-DD")}.csv`,
      data.byOwner,
      [
        { label: "Owner", value: (o) => o.ownerName },
        { label: "Lead Count", value: (o) => o.leadCount },
        { label: "Closed-Won Count", value: (o) => o.closedWonCount },
        {
          label: "Win Rate",
          value: (o) => (o.leadCount === 0 ? "" : `${((o.closedWonCount / o.leadCount) * 100).toFixed(1)}%`),
        },
      ],
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" gutterBottom>
          Per-Salesperson Breakdown
        </Typography>
        {data && data.byOwner.length > 0 && (
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

      {data && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Owner</TableCell>
                <TableCell align="right">Lead Count</TableCell>
                <TableCell align="right">Closed-Won Count</TableCell>
                <TableCell align="right">Win Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.byOwner.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      No data yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {data.byOwner.map((owner) => (
                <TableRow key={owner.ownerId} hover>
                  <TableCell>{owner.ownerName}</TableCell>
                  <TableCell align="right">{owner.leadCount}</TableCell>
                  <TableCell align="right">{owner.closedWonCount}</TableCell>
                  <TableCell align="right">
                    {owner.leadCount === 0
                      ? "—"
                      : `${((owner.closedWonCount / owner.leadCount) * 100).toFixed(1)}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

/**
 * Admin-only reports/dashboard page (Phase 5): pipeline summary, conversion rate,
 * and visit completion charts, plus a per-salesperson breakdown table. Each section
 * fetches and loads independently so a slow/failing endpoint doesn't block the rest
 * of the page.
 */
export function ReportsPage() {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Reports &amp; Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <PipelineSummarySection />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <ConversionRateSection />
        </Grid>
        <Grid size={12}>
          <VisitsCompletedVsMissedSection />
        </Grid>
        <Grid size={12}>
          <OwnerBreakdownSection />
        </Grid>
      </Grid>
    </Box>
  );
}
