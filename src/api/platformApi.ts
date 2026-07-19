import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./axiosInstance";
import type { FeatureEntitlement } from "./entitlementApi";

const PLATFORM_KEY_STORAGE_KEY = "platformConsoleKey";

/**
 * Deliberately its own axios instance, not the shared `axiosInstance` - this
 * console isn't JWT/tenant-authenticated at all (see backend
 * InternalOrganizationController/InternalEntitlementController's javadoc): it
 * authenticates with a single shared secret header instead, entered once and
 * kept in sessionStorage (cleared when the browser tab closes) rather than
 * localStorage, since it's a higher-privilege operator credential.
 */
const platformAxios = axios.create({ baseURL: API_BASE_URL });

export function getStoredPlatformKey(): string | null {
  return sessionStorage.getItem(PLATFORM_KEY_STORAGE_KEY);
}

export function storePlatformKey(key: string): void {
  sessionStorage.setItem(PLATFORM_KEY_STORAGE_KEY, key);
}

export function clearStoredPlatformKey(): void {
  sessionStorage.removeItem(PLATFORM_KEY_STORAGE_KEY);
}

export interface PlatformOrganization {
  id: string;
  name: string;
  subdomain: string;
  createdAt: string;
  activeEntitlementCodes: FeatureEntitlement[];
}

async function getOrganizations(platformKey: string): Promise<PlatformOrganization[]> {
  const response = await platformAxios.get<PlatformOrganization[]>("/internal/organizations", {
    headers: { "X-Platform-Key": platformKey },
  });
  return response.data;
}

async function setEntitlement(
  platformKey: string,
  orgId: string,
  code: FeatureEntitlement,
  action: "GRANT" | "REVOKE",
): Promise<void> {
  await platformAxios.patch(
    `/internal/organizations/${orgId}/entitlements/${code}`,
    { action, grantedBy: action === "GRANT" ? "platform console" : undefined },
    { headers: { "X-Platform-Key": platformKey } },
  );
}

/**
 * Enabled only once a key is present - callers gate on `hasKey` themselves so
 * a wrong/missing key surfaces as a normal query error (401) on first use
 * rather than silently never firing.
 */
export function usePlatformOrganizations(platformKey: string | null) {
  return useQuery({
    queryKey: ["platform", "organizations", platformKey],
    queryFn: () => getOrganizations(platformKey as string),
    enabled: !!platformKey,
    retry: false,
  });
}

export function useSetPlatformEntitlement(platformKey: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, code, action }: { orgId: string; code: FeatureEntitlement; action: "GRANT" | "REVOKE" }) =>
      setEntitlement(platformKey as string, orgId, code, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "organizations"] });
    },
  });
}
