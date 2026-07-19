import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  useMyEntitlements,
  type FeatureEntitlement,
} from "../api/entitlementApi";

interface EntitlementContextValue {
  entitlements: FeatureEntitlement[];
  isLoading: boolean;
  hasEntitlement: (code: FeatureEntitlement) => boolean;
}

const EntitlementContext = createContext<EntitlementContextValue | undefined>(
  undefined,
);

/**
 * Fetches the current org's licensed feature entitlements once per session
 * (gated on auth, same as AppThemeProvider's org-theme fetch) and exposes a
 * simple hasEntitlement() check for conditionally rendering gated nav items/
 * routes. No entitled features exist yet in the UI - this is the plumbing
 * Part B's Leave/Attendance module will consume once it's built.
 */
export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useMyEntitlements(isAuthenticated);

  const value = useMemo<EntitlementContextValue>(() => {
    const entitlements = data ?? [];
    return {
      entitlements,
      isLoading,
      hasEntitlement: (code) => entitlements.includes(code),
    };
  }, [data, isLoading]);

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlements(): EntitlementContextValue {
  const context = useContext(EntitlementContext);
  if (!context) {
    throw new Error("useEntitlements must be used within an EntitlementProvider");
  }
  return context;
}
