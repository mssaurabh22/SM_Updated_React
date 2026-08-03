import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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
import { LEAD_STATUSES, getLeads, useLeads } from "../../api/leadsApi";
import type { LeadStatus } from "../../api/leadsApi";
import {
  useConversionRate,
  useInterestLevelStatusMatrix,
  usePipelineSummary,
  useTeamProgress,
  useVisitsByType,
  useVisitsCompletedVsMissed,
} from "../../api/reportingApi";
import type { TeamMemberProgress } from "../../api/reportingApi";
import { useMasterData } from "../../api/masterDataApi";
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

const VISIT_TYPE_LABELS: Record<"FIELD" | "TELEPHONIC", string> = {
  FIELD: "Field",
  TELEPHONIC: "Telephonic",
};

function VisitsByTypeSection() {
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
  const [dateTo, setDateTo] = useState<Dayjs | null>(null);
  const theme = useTheme();

  const { data, isLoading, isError, error } = useVisitsByType(
    dateFrom ? dateFrom.format("YYYY-MM-DD") : undefined,
    dateTo ? dateTo.format("YYYY-MM-DD") : undefined,
  );

  const chartData = data
    ? (["FIELD", "TELEPHONIC"] as const).map((type) => ({
        name: VISIT_TYPE_LABELS[type],
        value: data.byType[type] ?? 0,
        key: type,
      }))
    : [];
  const barColors: Record<string, string> = {
    FIELD: theme.palette.primary.main,
    TELEPHONIC: theme.palette.secondary.main,
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Visits by Type
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

      {data && data.total === 0 && (
        <Typography color="text.secondary">No visits yet.</Typography>
      )}

      {data && data.total > 0 && (
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
      )}
    </Paper>
  );
}

function InterestLevelStatusMatrixSection() {
  const { data, isLoading, isError, error } = useInterestLevelStatusMatrix();

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Interest Level x Status
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        How many leads at each interest level (Hot/Warm/Cold) sit in each pipeline stage.
      </Typography>

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Interest Level</TableCell>
                {LEAD_STATUSES.map((status) => (
                  <TableCell key={status} align="right">
                    {LEAD_STATUS_LABELS[status]}
                  </TableCell>
                ))}
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.interestLevel} hover>
                  <TableCell>{row.interestLevel}</TableCell>
                  {LEAD_STATUSES.map((status) => (
                    <TableCell key={status} align="right">
                      {row.byStatus[status] ?? 0}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <strong>{row.total}</strong>
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
 * Read-only "who's doing what" rollup for a manager/admin overseeing a team - one row per
 * team member (Admins see every other active employee; an entitled manager sees their
 * subordinates - see ReportingService#resolveTeamMemberIds) with their lead counts by status,
 * visits due today/in the next 7 days, and when they were last active in the system. No
 * drill-down/edit actions here - purely a scan-the-team-at-a-glance view for now.
 */
function TeamProgressSection() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useTeamProgress();

  const handleExport = () => {
    if (!data) return;
    exportToCsv(
      `team-progress-${dayjs().format("YYYY-MM-DD")}.csv`,
      data.members,
      [
        { label: "Team Member", value: (m) => m.employeeName },
        { label: "Total Leads", value: (m) => m.totalLeads },
        ...LEAD_STATUSES.map((status) => ({
          label: LEAD_STATUS_LABELS[status],
          value: (m: TeamMemberProgress) => m.leadCountsByStatus[status] ?? 0,
        })),
        { label: "Visits Due Today", value: (m) => m.visitsDueToday },
        { label: "Visits Upcoming (7d)", value: (m) => m.visitsUpcoming },
        {
          label: "Last Activity",
          value: (m) => (m.lastActivityAt ? dayjs(m.lastActivityAt).format("YYYY-MM-DD HH:mm") : ""),
        },
      ],
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Team Progress
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Each team member's current lead pipeline, upcoming visits, and last activity.
          </Typography>
        </Box>
        {data && data.members.length > 0 && (
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

      {data && data.members.length === 0 && (
        <Typography color="text.secondary">No team members to show yet.</Typography>
      )}

      {data && data.members.length > 0 && (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Team Member</TableCell>
                <TableCell align="right">Total Leads</TableCell>
                {LEAD_STATUSES.map((status) => (
                  <TableCell key={status} align="right">
                    {LEAD_STATUS_LABELS[status]}
                  </TableCell>
                ))}
                <TableCell align="right">Due Today</TableCell>
                <TableCell align="right">Upcoming (7d)</TableCell>
                <TableCell>Last Activity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.members.map((member) => (
                <TableRow
                  key={member.employeeId}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/app/team/${member.employeeId}`)}
                >
                  <TableCell>{member.employeeName}</TableCell>
                  <TableCell align="right">
                    <strong>{member.totalLeads}</strong>
                  </TableCell>
                  {LEAD_STATUSES.map((status) => (
                    <TableCell key={status} align="right">
                      {member.leadCountsByStatus[status] ?? 0}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    {member.visitsDueToday > 0 ? (
                      <Chip label={member.visitsDueToday} size="small" color="warning" />
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell align="right">{member.visitsUpcoming}</TableCell>
                  <TableCell>
                    {member.lastActivityAt
                      ? dayjs(member.lastActivityAt).format("DD MMM YYYY, HH:mm")
                      : "No activity yet"}
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

const LEADS_REPORT_PAGE_SIZE = 20;

/**
 * The Reports section's filterable Leads table - State/City/Product/Date filters alongside the
 * existing Status filter, all pushed down to GET /leads (extended with stateId/cityId/
 * productId/dateFrom/dateTo - see leadsApi.ts's GetLeadsParams), same owner-scoping rule
 * (ADMIN unrestricted, an entitled manager sees their team) LeadService#list already enforces
 * for every other consumer of that endpoint.
 */
function FilterableLeadsSection() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [productId, setProductId] = useState("");
  const [dateFrom, setDateFrom] = useState<Dayjs | null>(null);
  const [dateTo, setDateTo] = useState<Dayjs | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const { data: states } = useMasterData("STATE");
  const { data: cities } = useMasterData("CITY");
  const { data: products } = useMasterData("PRODUCT");

  const filterParams = {
    status: status || undefined,
    stateId: stateId || undefined,
    cityId: cityId || undefined,
    productId: productId || undefined,
    dateFrom: dateFrom ? dateFrom.format("YYYY-MM-DD") : undefined,
    dateTo: dateTo ? dateTo.format("YYYY-MM-DD") : undefined,
  };

  const { data, isLoading, isError, error } = useLeads({
    ...filterParams,
    page,
    size: LEADS_REPORT_PAGE_SIZE,
  });

  const handleExport = async () => {
    setExportError(null);
    setExportLoading(true);
    try {
      const all = await getLeads({ ...filterParams, size: 1000 });
      exportToCsv(`leads-${dayjs().format("YYYY-MM-DD")}.csv`, all.content, [
        { label: "Company", value: (l) => l.companyName },
        { label: "Contact Person", value: (l) => l.contactPerson },
        { label: "Contact No", value: (l) => l.contactNo },
        { label: "Status", value: (l) => LEAD_STATUS_LABELS[l.status] },
        { label: "Created", value: (l) => dayjs(l.createdAt).format("YYYY-MM-DD") },
      ]);
    } catch (err) {
      setExportError(parseApiError(err).message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6">All Leads</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          disabled={exportLoading || !data || data.totalElements === 0}
        >
          {exportLoading ? "Exporting..." : "Export CSV"}
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2, flexWrap: "wrap" }}>
        <TextField
          select
          label="Status"
          size="small"
          sx={{ minWidth: 160 }}
          value={status}
          onChange={(e) => {
            setPage(0);
            setStatus(e.target.value as LeadStatus | "");
          }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {LEAD_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="State"
          size="small"
          sx={{ minWidth: 160 }}
          value={stateId}
          onChange={(e) => {
            setPage(0);
            setStateId(e.target.value);
          }}
        >
          <MenuItem value="">All states</MenuItem>
          {(states ?? []).map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="City"
          size="small"
          sx={{ minWidth: 160 }}
          value={cityId}
          onChange={(e) => {
            setPage(0);
            setCityId(e.target.value);
          }}
        >
          <MenuItem value="">All cities</MenuItem>
          {(cities ?? []).map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Product"
          size="small"
          sx={{ minWidth: 160 }}
          value={productId}
          onChange={(e) => {
            setPage(0);
            setProductId(e.target.value);
          }}
        >
          <MenuItem value="">All products</MenuItem>
          {(products ?? []).map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>

        <DatePicker
          label="Created from"
          value={dateFrom}
          onChange={(value) => {
            setPage(0);
            setDateFrom(value);
          }}
          slotProps={{ textField: { size: "small" } }}
        />
        <DatePicker
          label="Created to"
          value={dateTo}
          onChange={(value) => {
            setPage(0);
            setDateTo(value);
          }}
          slotProps={{ textField: { size: "small" } }}
        />
      </Stack>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {isLoading && <SectionLoading />}
      {isError && <Alert severity="error">{parseApiError(error).message}</Alert>}

      {data && (
        <>
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Company</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        No leads match these filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {data.content.map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>{lead.companyName}</TableCell>
                    <TableCell>{lead.contactPerson}</TableCell>
                    <TableCell>{lead.contactNo}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={LEAD_STATUS_LABELS[lead.status]}
                        color={LEAD_STATUS_COLORS[lead.status]}
                      />
                    </TableCell>
                    <TableCell>{dayjs(lead.createdAt).format("DD MMM YYYY")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {data.totalPages > 1 && (
            <Stack direction="row" sx={{ justifyContent: "center", mt: 2 }}>
              <Pagination
                count={data.totalPages}
                page={page + 1}
                onChange={(_, next) => setPage(next - 1)}
              />
            </Stack>
          )}
        </>
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
          <TeamProgressSection />
        </Grid>
        <Grid size={12}>
          <VisitsCompletedVsMissedSection />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <VisitsByTypeSection />
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <InterestLevelStatusMatrixSection />
        </Grid>
        <Grid size={12}>
          <OwnerBreakdownSection />
        </Grid>
        <Grid size={12}>
          <FilterableLeadsSection />
        </Grid>
      </Grid>
    </Box>
  );
}
