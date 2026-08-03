import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

/**
 * Theme settings shape shared by both the org-wide branding endpoints and the
 * per-user preference endpoints. Every field is optional/nullable: on the org
 * endpoints the backend always returns a fully-defaulted object (no nulls), while
 * on the personal-preference endpoints any field may genuinely be null, meaning
 * "inherit the organization's value for this field".
 */
export interface ThemeSettings {
  primaryColor?: string | null;
  mode?: string | null;
  density?: string | null;
  /** "STANDARD" (default) or "MINIMALIST" - a flatter, lower-visual-noise app-wide look
   * (no shadows, thinner nav highlight, lighter heading weights) - see createAppTheme.ts. */
  uiStyle?: string | null;
}

// Theme rarely changes, so we don't want to refetch aggressively (no window-focus
// spam, long staleTime) — this just needs to be fresh enough to reflect an admin's
// or the user's own recent save, which we already handle via invalidation on save.
const THEME_STALE_TIME_MS = 5 * 60 * 1000;

export async function getOrganizationTheme(): Promise<ThemeSettings> {
  const response = await axiosInstance.get<ThemeSettings>(
    "/organizations/me/theme",
  );
  return response.data;
}

export async function updateOrganizationTheme(
  payload: ThemeSettings,
): Promise<ThemeSettings> {
  const response = await axiosInstance.put<ThemeSettings>(
    "/organizations/me/theme",
    payload,
  );
  return response.data;
}

export async function getMyThemePreference(): Promise<ThemeSettings> {
  const response = await axiosInstance.get<ThemeSettings>(
    "/employees/me/theme-preference",
  );
  return response.data;
}

export async function updateMyThemePreference(
  payload: ThemeSettings,
): Promise<ThemeSettings> {
  const response = await axiosInstance.put<ThemeSettings>(
    "/employees/me/theme-preference",
    payload,
  );
  return response.data;
}

export const ORGANIZATION_THEME_QUERY_KEY = ["organizationTheme"] as const;
export const MY_THEME_PREFERENCE_QUERY_KEY = ["myThemePreference"] as const;

/**
 * Fetches the organization's branding defaults. `enabled` should be tied to auth
 * state by the caller (e.g. AppThemeProvider passes `isAuthenticated`) since this
 * endpoint requires a bearer token and there's no org to fetch for before login.
 */
export function useOrganizationTheme(
  options: Pick<UseQueryOptions<ThemeSettings>, "enabled"> = {},
) {
  return useQuery({
    queryKey: ORGANIZATION_THEME_QUERY_KEY,
    queryFn: getOrganizationTheme,
    staleTime: THEME_STALE_TIME_MS,
    ...options,
  });
}

export function useUpdateOrganizationTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ThemeSettings) => updateOrganizationTheme(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(ORGANIZATION_THEME_QUERY_KEY, data);
    },
  });
}

/**
 * Fetches the current user's personal theme overrides (each field individually
 * nullable). `enabled` should be tied to auth state — see useOrganizationTheme.
 */
export function useMyThemePreference(
  options: Pick<UseQueryOptions<ThemeSettings>, "enabled"> = {},
) {
  return useQuery({
    queryKey: MY_THEME_PREFERENCE_QUERY_KEY,
    queryFn: getMyThemePreference,
    staleTime: THEME_STALE_TIME_MS,
    ...options,
  });
}

export function useUpdateMyThemePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ThemeSettings) => updateMyThemePreference(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(MY_THEME_PREFERENCE_QUERY_KEY, data);
    },
  });
}
