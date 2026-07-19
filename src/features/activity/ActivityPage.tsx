import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link as MuiLink,
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
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../../auth/AuthContext";
import { useEmployees } from "../../api/employeesApi";
import type { ActivityEntry, ActivityType } from "../../api/activityApi";
import { ACTIVITY_TYPES, getActivity, useActivity } from "../../api/activityApi";
import { parseApiError } from "../../api/errorHelpers";
import { exportToCsv } from "../../utils/exportToCsv";
import { TableToolbar } from "../../components/TableToolbar";
import {
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_ICONS,
  ACTIVITY_TYPE_LABELS,
  resolveActorName,
} from "./activityConfig";

const PAGE_SIZE = 20;

/**
 * Org-wide (Admin) / personal (Employee) activity feed - a paginated read-only
 * log of everything that's happened across leads (creation, status changes,
 * reassignment, visits, lapses). Structurally mirrors LeadListPage: filters up
 * top, a table below, admin-only Owner filter since non-admins are already
 * scoped server-side to their own owned-leads' activity.
 */
export function ActivityPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<ActivityType | "">("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [search, setSearch] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Only admins see/use the owner filter, but employee lookup (for resolving
  // actorId -> name) is harmless and cheap to fetch regardless.
  const { data: employeesPage } = useEmployees({ size: 200 });

  const { data, isLoading, isError, error } = useActivity({
    page,
    size: PAGE_SIZE,
    type: typeFilter || undefined,
    ownerId: isAdmin ? ownerFilter || undefined : undefined,
  });

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employeesPage?.content ?? []) {
      map.set(emp.id, emp.fullName);
    }
    return map;
  }, [employeesPage]);

  const visibleActivity = useMemo(() => {
    const content = data?.content ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return content;
    return content.filter(
      (entry) =>
        entry.description.toLowerCase().includes(term) ||
        entry.companyName.toLowerCase().includes(term),
    );
  }, [data, search]);

  const handleExport = async () => {
    setExportError(null);
    setExportLoading(true);
    try {
      const all = await getActivity({
        size: 1000,
        type: typeFilter || undefined,
        ownerId: isAdmin ? ownerFilter || undefined : undefined,
      });
      exportToCsv<ActivityEntry>(`activity-${dayjs().format("YYYY-MM-DD")}.csv`, all.content, [
        { label: "Type", value: (e) => ACTIVITY_TYPE_LABELS[e.type] },
        { label: "Description", value: (e) => e.description },
        { label: "Company", value: (e) => e.companyName },
        { label: "Actor", value: (e) => resolveActorName(e.actorId, employeeNameById) },
        { label: "When", value: (e) => dayjs(e.createdAt).format("YYYY-MM-DD HH:mm") },
      ]);
    } catch (err) {
      setExportError(parseApiError(err).message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Activity
      </Typography>

      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search description, company..."
        onExport={handleExport}
        exportDisabled={!data || data.content.length === 0}
        exportLoading={exportLoading}
      >
        <TextField
          select
          label="Type"
          size="small"
          sx={{ minWidth: 180, flexShrink: 0 }}
          value={typeFilter}
          onChange={(e) => {
            setPage(0);
            setTypeFilter(e.target.value as ActivityType | "");
          }}
        >
          <MenuItem value="">All types</MenuItem>
          {ACTIVITY_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </MenuItem>
          ))}
        </TextField>

        {isAdmin && (
          <TextField
            select
            label="Owner"
            size="small"
            sx={{ minWidth: 180, flexShrink: 0 }}
            value={ownerFilter}
            onChange={(e) => {
              setPage(0);
              setOwnerFilter(e.target.value);
            }}
          >
            <MenuItem value="">All owners</MenuItem>
            {(employeesPage?.content ?? []).map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>
                {emp.fullName}
              </MenuItem>
            ))}
          </TextField>
        )}
      </TableToolbar>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {parseApiError(error).message}
        </Alert>
      )}

      {data && (
        <>
          {data.content.length === 0 && (
            <Paper variant="outlined" sx={{ py: 4 }}>
              <Typography color="text.secondary" align="center">
                No activity yet.
              </Typography>
            </Paper>
          )}

          {data.content.length > 0 && visibleActivity.length === 0 && (
            <Paper variant="outlined" sx={{ py: 4 }}>
              <Typography color="text.secondary" align="center">
                No activity matches your search.
              </Typography>
            </Paper>
          )}

          {isMobile && visibleActivity.length > 0 && (
            <Stack spacing={1.5}>
              {visibleActivity.map((entry) => {
                const Icon = ACTIVITY_TYPE_ICONS[entry.type];
                return (
                  <Card key={entry.id} variant="outlined">
                    <CardContent>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}
                      >
                        <Chip
                          icon={<Icon fontSize="small" />}
                          label={ACTIVITY_TYPE_LABELS[entry.type]}
                          color={ACTIVITY_TYPE_COLORS[entry.type]}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(entry.createdAt).format("DD MMM, HH:mm")}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {entry.description}
                      </Typography>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                        <MuiLink component={RouterLink} to={`/app/leads/${entry.leadId}`}>
                          {entry.companyName}
                        </MuiLink>
                        <Typography variant="caption" color="text.secondary">
                          {resolveActorName(entry.actorId, employeeNameById)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          {!isMobile && visibleActivity.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Company</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>When</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleActivity.map((entry) => {
                    const Icon = ACTIVITY_TYPE_ICONS[entry.type];
                    return (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Chip
                            icon={<Icon fontSize="small" />}
                            label={ACTIVITY_TYPE_LABELS[entry.type]}
                            color={ACTIVITY_TYPE_COLORS[entry.type]}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          <MuiLink
                            component={RouterLink}
                            to={`/app/leads/${entry.leadId}`}
                          >
                            {entry.companyName}
                          </MuiLink>
                        </TableCell>
                        <TableCell>
                          {resolveActorName(entry.actorId, employeeNameById)}
                        </TableCell>
                        <TableCell>
                          {dayjs(entry.createdAt).format("DD MMM YYYY, HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

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
    </Box>
  );
}
