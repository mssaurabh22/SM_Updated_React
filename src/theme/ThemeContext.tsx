import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useAuth } from "../auth/AuthContext";
import {
  useMyThemePreference,
  useOrganizationTheme,
  type ThemeSettings,
} from "../api/themeApi";
import { createAppTheme, type EffectiveThemeSettings } from "./createAppTheme";

/** Ultimate fallback when nothing has ever been customized — matches the
 * original static theme exactly, so an out-of-the-box org looks unchanged. */
const HARDCODED_DEFAULTS: EffectiveThemeSettings = {
  primaryColor: "#1565c0",
  mode: "light",
  density: "comfortable",
};

function toMuiMode(mode: string | null | undefined): "light" | "dark" {
  return mode?.toUpperCase() === "DARK" ? "dark" : "light";
}

function toMuiDensity(
  density: string | null | undefined,
): "comfortable" | "compact" {
  return density?.toUpperCase() === "COMPACT" ? "compact" : "comfortable";
}

/**
 * Merges org-wide branding defaults with the current user's personal overrides:
 * for each field, personal preference wins if set, else the org default, else the
 * hardcoded fallback. MUI-facing enums (mode/density) are lowercased here, at the
 * boundary where org + personal settings are resolved into one — `createAppTheme`
 * itself stays agnostic of the backend's uppercase representation.
 */
export function resolveEffectiveTheme(
  orgTheme: ThemeSettings | undefined,
  userPreference: ThemeSettings | undefined,
): EffectiveThemeSettings {
  const primaryColor =
    userPreference?.primaryColor ??
    orgTheme?.primaryColor ??
    HARDCODED_DEFAULTS.primaryColor;
  const mode = userPreference?.mode ?? orgTheme?.mode ?? "LIGHT";
  const density = userPreference?.density ?? orgTheme?.density ?? "COMFORTABLE";

  return {
    primaryColor,
    mode: toMuiMode(mode),
    density: toMuiDensity(density),
  };
}

function themeCacheKey(orgId: string): string {
  return `salesmanager.theme.${orgId}`;
}

/** Synchronous read used only to pick an initial paint before the network
 * responses arrive — never trusted as the final answer. */
function readCachedTheme(orgId: string | null): EffectiveThemeSettings | null {
  if (!orgId) return null;
  try {
    const raw = window.localStorage.getItem(themeCacheKey(orgId));
    if (!raw) return null;
    return JSON.parse(raw) as EffectiveThemeSettings;
  } catch {
    return null;
  }
}

function writeCachedTheme(
  orgId: string,
  settings: EffectiveThemeSettings,
): void {
  try {
    window.localStorage.setItem(themeCacheKey(orgId), JSON.stringify(settings));
  } catch {
    // Best-effort cache only — a full disk or disabled storage shouldn't break theming.
  }
}

/**
 * Owns the runtime-configurable theme. Fetches org branding + the current user's
 * personal override (both gated on `isAuthenticated`, since neither endpoint is
 * reachable pre-login and there's no org to fetch for on the public /login page),
 * merges them via `resolveEffectiveTheme`, builds the MUI theme, and renders
 * `<ThemeProvider><CssBaseline />{children}</ThemeProvider>` — replacing the old
 * static top-level ThemeProvider+CssBaseline in App.tsx.
 *
 * For instant paint on repeat visits, the last resolved theme is cached in
 * localStorage per-org and read synchronously as the initial state, then
 * reconciled with the live server values once the queries resolve. The Settings
 * page achieves "instant preview" of in-progress edits by writing directly into
 * the same React Query cache entries these hooks read (see SettingsPage.tsx),
 * so a preview flows through here with no additional plumbing.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, orgId } = useAuth();

  const { data: orgTheme } = useOrganizationTheme({ enabled: isAuthenticated });
  const { data: userPreference } = useMyThemePreference({
    enabled: isAuthenticated,
  });

  const [effective, setEffective] = useState<EffectiveThemeSettings>(() =>
    isAuthenticated
      ? readCachedTheme(orgId) ?? HARDCODED_DEFAULTS
      : HARDCODED_DEFAULTS,
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setEffective(HARDCODED_DEFAULTS);
      return;
    }
    if (orgTheme === undefined && userPreference === undefined) {
      // Neither query has resolved yet — keep showing the cached/hardcoded value
      // already in state rather than flashing back to the hardcoded default.
      return;
    }
    const resolved = resolveEffectiveTheme(orgTheme, userPreference);
    setEffective(resolved);
    if (orgId) {
      writeCachedTheme(orgId, resolved);
    }
  }, [isAuthenticated, orgTheme, userPreference, orgId]);

  const theme = useMemo(() => createAppTheme(effective), [effective]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
