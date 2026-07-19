import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import EventNoteIcon from "@mui/icons-material/EventNote";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useMasterData } from "../../api/masterDataApi";
import { getLead, useLead } from "../../api/leadsApi";
import type { Visit } from "../../api/visitsApi";
import { useTodaysFollowUps } from "../../api/visitsApi";
import { useEmployee } from "../../api/employeesApi";
import { useAuth } from "../../auth/AuthContext";
import { parseApiError } from "../../api/errorHelpers";
import { StatCard } from "../../components/StatCard";
import { exportToCsv } from "../../utils/exportToCsv";

/** "Good morning"/"afternoon"/"evening" based on the visitor's local clock. */
function greetingForTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const VISIT_TYPE_LABELS: Record<Visit["visitType"], string> = {
  FIELD: "Field Visit",
  TELEPHONIC: "Telephonic Visit",
};

interface FollowUpRowProps {
  visit: Visit;
  purposeMap: Map<string, string>;
  onNavigate: (leadId: string) => void;
}

/**
 * One row per visit; resolves the parent lead's company name via useLead.
 * Simplest approach given today's-follow-ups lists are short (a handful of
 * rows per user per day) - not worth a dedicated batch-lookup endpoint yet.
 */
function FollowUpRow({ visit, purposeMap, onNavigate }: FollowUpRowProps) {
  const { data: lead, isLoading } = useLead(visit.leadId);

  return (
    <TableRow hover sx={{ cursor: "pointer" }} onClick={() => onNavigate(visit.leadId)}>
      <TableCell>
        {isLoading ? "…" : (lead?.companyName ?? "—")}
      </TableCell>
      <TableCell>{dayjs(visit.visitDate).format("DD MMM YYYY")}</TableCell>
      <TableCell>
        <Chip label={VISIT_TYPE_LABELS[visit.visitType]} size="small" variant="outlined" />
      </TableCell>
      <TableCell>
        {visit.purposeId ? (purposeMap.get(visit.purposeId) ?? "—") : "—"}
      </TableCell>
    </TableRow>
  );
}

/**
 * New landing content at /app: an agenda of the caller's own visits due
 * today-or-earlier that are still PLANNED, replacing the old placeholder.
 */
export function TodaysFollowUpsPage() {
  const navigate = useNavigate();
  const { employeeId, email } = useAuth();
  const { data: self } = useEmployee(employeeId);
  const { data: visits, isLoading, isError, error } = useTodaysFollowUps();
  const { data: purposes } = useMasterData("VISIT_PURPOSE");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const purposeMap = new Map((purposes ?? []).map((p) => [p.id, p.label]));
  const firstName = (self?.fullName ?? email ?? "").split(" ")[0] || undefined;

  // Company name is resolved per-row (FollowUpRow's own useLead call) since this
  // list is short - re-fetching those same leads here rather than reading the
  // query cache directly keeps this independent of React Query internals.
  const handleExport = async () => {
    if (!visits || visits.length === 0) return;
    setExporting(true);
    setExportError(null);
    try {
      const uniqueLeadIds = [...new Set(visits.map((v) => v.leadId))];
      const leads = await Promise.all(uniqueLeadIds.map((id) => getLead(id)));
      const companyNameByLeadId = new Map(leads.map((lead) => [lead.id, lead.companyName]));
      exportToCsv(
        `todays-followups-${dayjs().format("YYYY-MM-DD")}.csv`,
        visits,
        [
          { label: "Company", value: (v) => companyNameByLeadId.get(v.leadId) ?? "" },
          { label: "Visit Date", value: (v) => v.visitDate },
          { label: "Type", value: (v) => VISIT_TYPE_LABELS[v.visitType] },
          { label: "Purpose", value: (v) => (v.purposeId ? (purposeMap.get(v.purposeId) ?? "") : "") },
        ],
      );
    } catch (err) {
      setExportError(parseApiError(err).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        {greetingForTimeOfDay()}
        {firstName ? `, ${firstName}` : ""}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Here's what's on your plate today.
      </Typography>

      {visits && (
        <Box sx={{ mb: 3, maxWidth: 320 }}>
          <StatCard
            icon={<EventNoteIcon />}
            color={visits.length > 0 ? "warning" : "success"}
            value={visits.length}
            label={visits.length === 1 ? "follow-up due" : "follow-ups due"}
          />
        </Box>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">{parseApiError(error).message}</Alert>
      )}

      {visits && visits.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Typography color="text.secondary">
            No follow-ups due today.
          </Typography>
        </Paper>
      )}

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {visits && visits.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </Box>
      )}

      {visits && visits.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Visit Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Purpose</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visits.map((visit) => (
                <FollowUpRow
                  key={visit.id}
                  visit={visit}
                  purposeMap={purposeMap}
                  onNavigate={(leadId) => navigate(`/app/leads/${leadId}`)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
