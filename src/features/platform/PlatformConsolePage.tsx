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
  Container,
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
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LogoutIcon from "@mui/icons-material/Logout";
import { FEATURE_ENTITLEMENTS } from "../../api/entitlementApi";
import type { PlatformOrganization } from "../../api/platformApi";
import {
  clearStoredPlatformKey,
  getStoredPlatformKey,
  storePlatformKey,
  useSetPlatformEntitlement,
  usePlatformOrganizations,
} from "../../api/platformApi";
import { parseApiError } from "../../api/errorHelpers";
import { TableToolbar } from "../../components/TableToolbar";
import { exportToCsv } from "../../utils/exportToCsv";

/** Simple, human-readable labels for the entitlement codes that exist today. */
const ENTITLEMENT_LABELS: Record<string, string> = {
  EMPLOYEE_LEAVE_MANAGEMENT: "Employee Leave Management",
  TEAM_VISIBILITY: "Manager Team Visibility (Leads/Visits/Reports)",
};

function KeyEntryScreen({ onSubmit, error }: { onSubmit: (key: string) => void; error?: string | null }) {
  const [key, setKey] = useState("");
  return (
    <Container maxWidth="xs" sx={{ mt: { xs: 6, sm: 12 } }}>
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Stack spacing={1} sx={{ alignItems: "center", mb: 2 }}>
          <LockOpenIcon color="action" />
          <Typography variant="h6">Platform Console</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Enter the platform admin key to manage organization entitlements.
          </Typography>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            e.preventDefault();
            if (key.trim()) onSubmit(key.trim());
          }}
        >
          <TextField
            label="Platform admin key"
            type="password"
            autoFocus
            fullWidth
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <Button type="submit" variant="contained" disabled={!key.trim()}>
            Continue
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

/**
 * Standalone, non-tenant-scoped screen for whoever operates the platform to
 * grant/revoke feature entitlements across every organization - a thin UI over
 * the existing internal endpoints, replacing hand-crafted curl calls. Deliberately
 * outside the normal JWT/AuthContext flow: authenticates with the same shared
 * platform key the backend already expects, kept in sessionStorage only.
 */
export function PlatformConsolePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [platformKey, setPlatformKey] = useState<string | null>(() => getStoredPlatformKey());
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = usePlatformOrganizations(platformKey);
  const entitlementMutation = useSetPlatformEntitlement(platformKey);
  const [rowError, setRowError] = useState<string | null>(null);

  const handleKeySubmit = (key: string) => {
    storePlatformKey(key);
    setPlatformKey(key);
  };

  const handleLogout = () => {
    clearStoredPlatformKey();
    setPlatformKey(null);
  };

  // A wrong/expired key surfaces as a 401 on first fetch - drop back to the
  // key-entry screen with a clear message rather than showing a bare table error.
  if (platformKey && isError && parseApiError(error).status === 401) {
    return (
      <KeyEntryScreen
        onSubmit={handleKeySubmit}
        error="That key was rejected. Check the PLATFORM_ADMIN_KEY value and try again."
      />
    );
  }

  if (!platformKey) {
    return <KeyEntryScreen onSubmit={handleKeySubmit} />;
  }

  const orgs = data ?? [];
  const term = search.trim().toLowerCase();
  const visibleOrgs = term
    ? orgs.filter((o) => o.name.toLowerCase().includes(term) || o.subdomain.toLowerCase().includes(term))
    : orgs;

  const handleExport = () => {
    exportToCsv(`platform-organizations-${dayjs().format("YYYY-MM-DD")}.csv`, visibleOrgs, [
      { label: "Name", value: (o) => o.name },
      { label: "Subdomain", value: (o) => o.subdomain },
      { label: "Created", value: (o) => dayjs(o.createdAt).format("YYYY-MM-DD") },
      { label: "Active Entitlements", value: (o) => o.activeEntitlementCodes.join("; ") },
    ]);
  };

  const handleToggle = async (org: PlatformOrganization, code: string, isActive: boolean) => {
    setRowError(null);
    try {
      await entitlementMutation.mutateAsync({
        orgId: org.id,
        code: code as (typeof FEATURE_ENTITLEMENTS)[number],
        action: isActive ? "REVOKE" : "GRANT",
      });
    } catch (err) {
      setRowError(parseApiError(err).message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5">Platform Console</Typography>
          <Typography variant="body2" color="text.secondary">
            Grant or revoke licensed features per organization.
          </Typography>
        </Box>
        <Button startIcon={<LogoutIcon />} onClick={handleLogout}>
          Log out
        </Button>
      </Stack>

      {rowError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRowError(null)}>
          {rowError}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && parseApiError(error).status !== 401 && (
        <Alert severity="error">{parseApiError(error).message}</Alert>
      )}

      {data && (
        <>
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search organization or subdomain..."
            onExport={handleExport}
            exportDisabled={visibleOrgs.length === 0}
          />

          {visibleOrgs.length === 0 && (
            <Paper variant="outlined" sx={{ py: 4 }}>
              <Typography color="text.secondary" align="center">
                No organizations match your search.
              </Typography>
            </Paper>
          )}

          {isMobile && visibleOrgs.length > 0 && (
            <Stack spacing={1.5}>
              {visibleOrgs.map((org) => (
                <OrgCard key={org.id} org={org} onToggle={handleToggle} />
              ))}
            </Stack>
          )}

          {!isMobile && visibleOrgs.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Subdomain</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Entitlements</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleOrgs.map((org) => (
                    <TableRow key={org.id} hover>
                      <TableCell>{org.name}</TableCell>
                      <TableCell>{org.subdomain}</TableCell>
                      <TableCell>{dayjs(org.createdAt).format("DD MMM YYYY")}</TableCell>
                      <TableCell>
                        <EntitlementToggles org={org} onToggle={handleToggle} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Container>
  );
}

interface EntitlementTogglesProps {
  org: PlatformOrganization;
  onToggle: (org: PlatformOrganization, code: string, isActive: boolean) => void;
}

function EntitlementToggles({ org, onToggle }: EntitlementTogglesProps) {
  const activeSet = useMemo(() => new Set(org.activeEntitlementCodes), [org.activeEntitlementCodes]);
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
      {FEATURE_ENTITLEMENTS.map((code) => {
        const isActive = activeSet.has(code);
        return (
          <Chip
            key={code}
            label={ENTITLEMENT_LABELS[code] ?? code}
            size="small"
            color={isActive ? "success" : "default"}
            variant={isActive ? "filled" : "outlined"}
            onClick={() => onToggle(org, code, isActive)}
            title={isActive ? "Click to revoke" : "Click to grant"}
          />
        );
      })}
    </Stack>
  );
}

function OrgCard({ org, onToggle }: EntitlementTogglesProps & { org: PlatformOrganization }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {org.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {org.subdomain} · {dayjs(org.createdAt).format("DD MMM YYYY")}
        </Typography>
        <EntitlementToggles org={org} onToggle={onToggle} />
      </CardContent>
    </Card>
  );
}
