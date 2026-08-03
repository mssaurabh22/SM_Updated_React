import { useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Link as MuiLink,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
import GroupsIcon from "@mui/icons-material/Groups";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import EventNoteIcon from "@mui/icons-material/EventNote";
import { useAuth } from "../../auth/AuthContext";
import { LEAD_STATUSES } from "../../api/leadsApi";
import type { LeadStatus } from "../../api/leadsApi";
import { useLead } from "../../api/leadsApi";
import {
  useConversionRate,
  useLeadsBySource,
  usePipelineSummary,
  useRevenue,
  useVisitsCompletedVsMissed,
} from "../../api/reportingApi";
import { useTodaysFollowUps, useVisits } from "../../api/visitsApi";
import type { Visit } from "../../api/visitsApi";
import { useActivity } from "../../api/activityApi";
import { parseApiError } from "../../api/errorHelpers";
import { StatCard } from "../../components/StatCard";
import { TypeIconAvatar } from "../../components/TypeIconAvatar";
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from "../leads/leadStatusConfig";
import {
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_ICONS,
  resolveActorName,
} from "../activity/activityConfig";
import { useEmployees } from "../../api/employeesApi";

const VISIT_TYPE_LABELS: Record<Visit["visitType"], string> = {
  FIELD: "Field Visit",
  TELEPHONIC: "Telephonic Visit",
};

/** Only the stages that represent forward progress - LOST/LAPSED are drop-offs, not pipeline
 * steps, and are covered separately by the Lead Status Overview chart below. Our LeadStatus
 * enum doesn't have distinct "Qualified"/"Proposal" stages the way some reference CRMs do -
 * this uses this app's own real pipeline stages rather than inventing new ones. Rendered as a
 * horizontal bar (not a geometric funnel) deliberately: a true funnel shape requires each
 * stage's count to be strictly smaller than the one before it, which isn't actually true of
 * this data (a Lead's status isn't a subset of the previous status - stage counts can go up
 * or down in any order), so a real funnel chart distorts into a bowtie/diamond shape whenever
 * a later stage happens to have more leads than an earlier one.  A bar chart shows exactly the
 * same information without that failure mode. */
const PIPELINE_STATUSES: LeadStatus[] = ["NEW", "INTERESTED", "CONTACTED", "NEGOTIATION", "CLOSED_WON"];

const CHART_PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899"];

function SectionLoading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

function SalesPipelineSection() {
  const { data, isLoading, isError, error } = usePipelineSummary();

  const chartData = PIPELINE_STATUSES.map((status) => ({
    name: LEAD_STATUS_LABELS[status],
    value: data?.byStatus[status] ?? 0,
    status,
  }));

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h6">Sales Pipeline</Typography>
        <MuiLink component={RouterLink} to="/app/reports" variant="body2">
          View All
        </MuiLink>
      </Stack>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} />
            <RechartsTooltip />
            <Bar dataKey="value" name="Leads">
              {chartData.map((entry, index) => (
                <Cell key={entry.status} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

function LeadsBySourceDonut() {
  const { data, isLoading, isError, error } = useLeadsBySource();
  const total = data?.bySource.reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Leads by Source
      </Typography>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && total === 0 && <Typography color="text.secondary">No leads yet.</Typography>}

      {data && total > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data.bySource}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={100}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {data.bySource.map((row, index) => (
                <Cell key={row.label} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Legend />
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

function LeadStatusOverviewBar() {
  const { data, isLoading, isError, error } = usePipelineSummary();
  const theme = useTheme();

  const chartData = LEAD_STATUSES.map((status) => ({
    name: LEAD_STATUS_LABELS[status],
    value: data?.byStatus[status] ?? 0,
    status,
  }));
  const barColors: Record<string, string> = {
    info: theme.palette.info.main,
    primary: theme.palette.primary.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    success: theme.palette.success.main,
    default: theme.palette.grey[500],
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Lead Status Overview
      </Typography>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip />
            <Bar dataKey="value" name="Leads">
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={barColors[LEAD_STATUS_COLORS[entry.status]]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

function TodaysFollowUpsWidget() {
  const { data: visits, isLoading } = useTodaysFollowUps();
  const top = (visits ?? []).slice(0, 5);

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="h6">Today's Follow-ups</Typography>
        <MuiLink component={RouterLink} to="/app/todays-follow-ups" variant="body2">
          View All
        </MuiLink>
      </Stack>

      {isLoading && <SectionLoading />}
      {!isLoading && top.length === 0 && (
        <Typography color="text.secondary">No follow-ups due today.</Typography>
      )}
      {!isLoading && top.length > 0 && (
        <Stack spacing={1.5}>
          {top.map((visit) => (
            <FollowUpListItem key={visit.id} visit={visit} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function UpcomingVisitsWidget() {
  const tomorrow = dayjs().add(1, "day");
  const weekOut = dayjs().add(7, "day");
  const { data, isLoading } = useVisits({
    status: "PLANNED",
    dateFrom: tomorrow.format("YYYY-MM-DD"),
    dateTo: weekOut.format("YYYY-MM-DD"),
    size: 5,
  });
  const visits = data?.content ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="h6">Upcoming Visits</Typography>
        <MuiLink component={RouterLink} to="/app/leads" variant="body2">
          View All
        </MuiLink>
      </Stack>

      {isLoading && <SectionLoading />}
      {!isLoading && visits.length === 0 && (
        <Typography color="text.secondary">Nothing scheduled in the next 7 days.</Typography>
      )}
      {!isLoading && visits.length > 0 && (
        <Stack spacing={1.5}>
          {visits.map((visit) => (
            <FollowUpListItem key={visit.id} visit={visit} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

/** One row for both Today's Follow-ups and Upcoming Visits - resolves the parent lead's company
 * name per row (short lists, same acceptable N+1 pattern TodaysFollowUpsPage's FollowUpRow
 * already uses) and links straight into that lead. */
function FollowUpListItem({ visit }: { visit: Visit }) {
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(visit.leadId);

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: "center", cursor: "pointer" }}
      onClick={() => navigate(`/app/leads/${visit.leadId}`)}
    >
      <EventNoteIcon fontSize="small" color="action" />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" noWrap>
          {isLoading ? "…" : (lead?.companyName ?? "—")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {dayjs(visit.visitDate).format("DD MMM")}
          {visit.scheduledTime ? `, ${visit.scheduledTime.slice(0, 5)}` : ""}
        </Typography>
      </Box>
      <Chip label={VISIT_TYPE_LABELS[visit.visitType]} size="small" variant="outlined" />
    </Stack>
  );
}

function RecentActivityWidget() {
  const { data, isLoading, isError, error } = useActivity({ size: 5 });
  const { data: employeesPage } = useEmployees({ size: 200 });
  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employeesPage?.content ?? []) map.set(emp.id, emp.fullName);
    return map;
  }, [employeesPage]);
  const entries = data?.content ?? [];

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="h6">Recent Activities</Typography>
        <MuiLink component={RouterLink} to="/app/activity" variant="body2">
          View All
        </MuiLink>
      </Stack>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}
      {!isLoading && entries.length === 0 && (
        <Typography color="text.secondary">No activity yet.</Typography>
      )}

      {entries.length > 0 && (
        <Stack spacing={1.5}>
          {entries.map((entry) => (
            <Stack key={entry.id} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <TypeIconAvatar
                icon={ACTIVITY_TYPE_ICONS[entry.type]}
                color={ACTIVITY_TYPE_COLORS[entry.type]}
                size={32}
              />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" noWrap>
                  {entry.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {entry.companyName} · {resolveActorName(entry.actorId, employeeNameById)} ·{" "}
                  {dayjs(entry.createdAt).format("DD MMM, HH:mm")}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

/**
 * Admin / TEAM_VISIBILITY-entitled-manager landing page (see AppRoutes.tsx: a plain EMPLOYEE
 * still gets TodaysFollowUpsPage at the same /app route, since the org-wide aggregates here
 * come from the same reporting endpoints ReportsPage uses, which 403 for anyone without
 * manager-level access - see ReportingService#resolveOwnerScope).
 */
export function DashboardPage() {
  const { email } = useAuth();
  const { data: pipeline } = usePipelineSummary();
  const { data: conversion } = useConversionRate();
  const { data: visitsSummary } = useVisitsCompletedVsMissed();
  const { data: revenue } = useRevenue();

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {email ? `Welcome back, ${email}` : "Here's your sales overview."}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: revenue?.entitled ? 3 : 4 }}>
          <StatCard icon={<GroupsIcon />} color="primary" value={pipeline?.totalLeads ?? "…"} label="Total Leads" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: revenue?.entitled ? 3 : 4 }}>
          <StatCard
            icon={<EmojiEventsIcon />}
            color="success"
            value={conversion?.closedWonCount ?? "…"}
            label="Conversions"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: revenue?.entitled ? 3 : 4 }}>
          <StatCard
            icon={<EventAvailableIcon />}
            color="warning"
            value={visitsSummary?.planned ?? "…"}
            label="Open Visits"
          />
        </Grid>
        {revenue?.entitled && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<CurrencyRupeeIcon />}
              color="info"
              value={`₹${revenue.revenue.toLocaleString("en-IN")}`}
              label="Revenue (YTD)"
            />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SalesPipelineSection />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <LeadsBySourceDonut />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TodaysFollowUpsWidget />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <UpcomingVisitsWidget />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <RecentActivityWidget />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={12}>
          <LeadStatusOverviewBar />
        </Grid>
      </Grid>
    </Box>
  );
}
