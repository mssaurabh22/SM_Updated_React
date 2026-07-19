import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { parseApiError } from "../../api/errorHelpers";
import {
  MY_THEME_PREFERENCE_QUERY_KEY,
  ORGANIZATION_THEME_QUERY_KEY,
  useMyThemePreference,
  useOrganizationTheme,
  useUpdateMyThemePreference,
  useUpdateOrganizationTheme,
  type ThemeSettings,
} from "../../api/themeApi";

type Mode = "LIGHT" | "DARK";
type Density = "COMFORTABLE" | "COMPACT";

/** Hardcoded fallbacks — must match createAppTheme.ts / ThemeContext.tsx exactly. */
const HARDCODED_DEFAULTS = {
  primaryColor: "#1565c0",
  mode: "LIGHT" as Mode,
  density: "COMFORTABLE" as Density,
};

/** How long to wait after the last edit before actually saving to the server.
 * The preview (via the shared React Query cache) is applied immediately on every
 * change; only the network round-trip is debounced. */
const SAVE_DEBOUNCE_MS = 500;

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Typography sx={{ minWidth: 140 }}>{label}</Typography>
      <Box
        component="label"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Box
          component="input"
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          sx={{
            width: 44,
            height: 32,
            padding: 0,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            cursor: disabled ? "default" : "pointer",
            background: "none",
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {value.toUpperCase()}
        </Typography>
      </Box>
    </Stack>
  );
}

function ResetButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      size="small"
      startIcon={<RestartAltIcon fontSize="small" />}
      onClick={onClick}
      disabled={disabled}
    >
      Use organization default
    </Button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {description}
      </Typography>
      {children}
    </Paper>
  );
}

/**
 * Settings page (route: /app/settings, open to all authenticated users).
 *
 * Two independent sections, each backed by its own query/mutation pair from
 * `api/themeApi.ts`:
 *  - "Organization branding": visible to everyone, editable only by ADMIN.
 *  - "My preference": visible and editable by everyone, with a per-field
 *    "Use organization default" action that clears that field back to null.
 *
 * Instant preview: every control change writes straight into the shared React
 * Query cache (the same query keys `AppThemeProvider` reads), so the app's live
 * theme updates immediately. The actual network save is debounced by
 * SAVE_DEBOUNCE_MS; if it fails, the cache (and this page's local draft) is
 * rolled back to the last confirmed server value and the error is surfaced.
 */
export function SettingsPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const queryClient = useQueryClient();

  const orgQuery = useOrganizationTheme();
  const prefQuery = useMyThemePreference();
  const orgMutation = useUpdateOrganizationTheme();
  const prefMutation = useUpdateMyThemePreference();

  const [orgError, setOrgError] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);

  const [orgDraft, setOrgDraft] = useState<{
    primaryColor: string;
    mode: Mode;
    density: Density;
  }>(HARDCODED_DEFAULTS);

  const [prefDraft, setPrefDraft] = useState<ThemeSettings>({
    primaryColor: null,
    mode: null,
    density: null,
  });

  // Last server-confirmed values, used to roll back an optimistic preview if the
  // debounced save fails. Deliberately NOT the query cache itself, since this
  // page writes optimistic previews into that same cache.
  const orgConfirmedRef = useRef<ThemeSettings | null>(null);
  const prefConfirmedRef = useRef<ThemeSettings | null>(null);

  const orgSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (orgQuery.data && orgConfirmedRef.current === null) {
      orgConfirmedRef.current = orgQuery.data;
      setOrgDraft({
        primaryColor: orgQuery.data.primaryColor ?? HARDCODED_DEFAULTS.primaryColor,
        mode: (orgQuery.data.mode as Mode | undefined) ?? HARDCODED_DEFAULTS.mode,
        density:
          (orgQuery.data.density as Density | undefined) ?? HARDCODED_DEFAULTS.density,
      });
    }
  }, [orgQuery.data]);

  useEffect(() => {
    if (prefQuery.data && prefConfirmedRef.current === null) {
      prefConfirmedRef.current = prefQuery.data;
      setPrefDraft(prefQuery.data);
    }
  }, [prefQuery.data]);

  useEffect(() => {
    return () => {
      if (orgSaveTimer.current) clearTimeout(orgSaveTimer.current);
      if (prefSaveTimer.current) clearTimeout(prefSaveTimer.current);
    };
  }, []);

  // --- Organization branding (admin-editable) ---

  function commitOrgChange(patch: Partial<ThemeSettings>) {
    if (!isAdmin) return;
    setOrgError(null);

    const nextDraft = { ...orgDraft, ...patch } as typeof orgDraft;
    setOrgDraft(nextDraft);
    queryClient.setQueryData(ORGANIZATION_THEME_QUERY_KEY, nextDraft);

    if (orgSaveTimer.current) clearTimeout(orgSaveTimer.current);
    orgSaveTimer.current = setTimeout(() => {
      orgMutation.mutate(patch, {
        onSuccess: (saved) => {
          orgConfirmedRef.current = saved;
        },
        onError: (error) => {
          const parsed = parseApiError(error);
          setOrgError(parsed.message);
          const fallback = orgConfirmedRef.current;
          if (fallback) {
            queryClient.setQueryData(ORGANIZATION_THEME_QUERY_KEY, fallback);
            setOrgDraft({
              primaryColor: fallback.primaryColor ?? HARDCODED_DEFAULTS.primaryColor,
              mode: (fallback.mode as Mode | undefined) ?? HARDCODED_DEFAULTS.mode,
              density:
                (fallback.density as Density | undefined) ?? HARDCODED_DEFAULTS.density,
            });
          }
        },
      });
    }, SAVE_DEBOUNCE_MS);
  }

  // --- Personal preference (everyone) ---

  function commitPrefChange(patch: Partial<ThemeSettings>) {
    setPrefError(null);

    const nextDraft = { ...prefDraft, ...patch };
    setPrefDraft(nextDraft);
    queryClient.setQueryData(MY_THEME_PREFERENCE_QUERY_KEY, nextDraft);

    if (prefSaveTimer.current) clearTimeout(prefSaveTimer.current);
    prefSaveTimer.current = setTimeout(() => {
      prefMutation.mutate(patch, {
        onSuccess: (saved) => {
          prefConfirmedRef.current = saved;
        },
        onError: (error) => {
          const parsed = parseApiError(error);
          setPrefError(parsed.message);
          const fallback = prefConfirmedRef.current;
          if (fallback) {
            queryClient.setQueryData(MY_THEME_PREFERENCE_QUERY_KEY, fallback);
            setPrefDraft(fallback);
          }
        },
      });
    }, SAVE_DEBOUNCE_MS);
  }

  /** Reset actions bypass the debounce — they're a single discrete action, not
   * a continuous drag, so there's no reason to wait before saving. */
  function resetPrefField(field: "primaryColor" | "mode" | "density") {
    if (prefSaveTimer.current) clearTimeout(prefSaveTimer.current);
    setPrefError(null);
    const nextDraft = { ...prefDraft, [field]: null };
    setPrefDraft(nextDraft);
    queryClient.setQueryData(MY_THEME_PREFERENCE_QUERY_KEY, nextDraft);
    const patch: ThemeSettings = { [field]: null } as ThemeSettings;
    prefMutation.mutate(
      patch,
      {
        onSuccess: (saved) => {
          prefConfirmedRef.current = saved;
        },
        onError: (error) => {
          const parsed = parseApiError(error);
          setPrefError(parsed.message);
          const fallback = prefConfirmedRef.current;
          if (fallback) {
            queryClient.setQueryData(MY_THEME_PREFERENCE_QUERY_KEY, fallback);
            setPrefDraft(fallback);
          }
        },
      },
    );
  }

  // Effective org values, used to show what "organization default" resolves to
  // next to each personal-preference control.
  const orgPrimaryColor = orgQuery.data?.primaryColor ?? HARDCODED_DEFAULTS.primaryColor;
  const orgMode = (orgQuery.data?.mode as Mode | undefined) ?? HARDCODED_DEFAULTS.mode;
  const orgDensity =
    (orgQuery.data?.density as Density | undefined) ?? HARDCODED_DEFAULTS.density;

  const prefColor = prefDraft.primaryColor ?? orgPrimaryColor;
  const prefMode = (prefDraft.mode as Mode | null) ?? orgMode;
  const prefDensity = (prefDraft.density as Density | null) ?? orgDensity;

  return (
    <Stack spacing={3} sx={{ maxWidth: 640 }}>
      <Typography variant="h5">Settings</Typography>

      <SectionCard
        title="Organization branding"
        description={
          isAdmin
            ? "These colors and defaults apply to everyone in your organization, unless a person sets their own preference below."
            : "Set by your administrator. Contact them to request a change."
        }
      >
        <Stack spacing={2}>
          {orgError && <Alert severity="error">{orgError}</Alert>}
          {orgQuery.isLoading ? (
            <Typography color="text.secondary">Loading...</Typography>
          ) : (
            <>
              <ColorField
                label="Primary color"
                value={orgDraft.primaryColor}
                disabled={!isAdmin}
                onChange={(value) => commitOrgChange({ primaryColor: value })}
              />

              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Typography sx={{ minWidth: 140 }}>Appearance</Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={orgDraft.mode}
                  disabled={!isAdmin}
                  onChange={(_, value: Mode | null) =>
                    value && commitOrgChange({ mode: value })
                  }
                >
                  <ToggleButton value="LIGHT">Light</ToggleButton>
                  <ToggleButton value="DARK">Dark</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Typography sx={{ minWidth: 140 }}>Density</Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={orgDraft.density}
                  disabled={!isAdmin}
                  onChange={(_, value: Density | null) =>
                    value && commitOrgChange({ density: value })
                  }
                >
                  <ToggleButton value="COMFORTABLE">Comfortable</ToggleButton>
                  <ToggleButton value="COMPACT">Compact</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </>
          )}
        </Stack>
      </SectionCard>

      <SectionCard
        title="My preference"
        description="Override the organization's branding just for your own account. Any field left as 'organization default' will always follow the org setting above, even if an admin changes it later."
      >
        <Stack spacing={2}>
          {prefError && <Alert severity="error">{prefError}</Alert>}
          {prefQuery.isLoading ? (
            <Typography color="text.secondary">Loading...</Typography>
          ) : (
            <>
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  rowGap: 1,
                }}
              >
                <ColorField
                  label="Primary color"
                  value={prefColor}
                  onChange={(value) => commitPrefChange({ primaryColor: value })}
                />
                <ResetButton
                  onClick={() => resetPrefField("primaryColor")}
                  disabled={prefDraft.primaryColor == null}
                />
              </Stack>

              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  rowGap: 1,
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Typography sx={{ minWidth: 140 }}>Appearance</Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={prefMode}
                    onChange={(_, value: Mode | null) =>
                      value && commitPrefChange({ mode: value })
                    }
                  >
                    <ToggleButton value="LIGHT">Light</ToggleButton>
                    <ToggleButton value="DARK">Dark</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <ResetButton
                  onClick={() => resetPrefField("mode")}
                  disabled={prefDraft.mode == null}
                />
              </Stack>

              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  rowGap: 1,
                }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Typography sx={{ minWidth: 140 }}>Density</Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={prefDensity}
                    onChange={(_, value: Density | null) =>
                      value && commitPrefChange({ density: value })
                    }
                  >
                    <ToggleButton value="COMFORTABLE">Comfortable</ToggleButton>
                    <ToggleButton value="COMPACT">Compact</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <ResetButton
                  onClick={() => resetPrefField("density")}
                  disabled={prefDraft.density == null}
                />
              </Stack>
            </>
          )}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
