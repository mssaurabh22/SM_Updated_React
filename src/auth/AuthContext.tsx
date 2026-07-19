import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import * as authApi from "../api/authApi";
import type {
  LoginPayload,
  RegisterOrganizationPayload,
} from "../api/authApi";
import {
  clearAuthState,
  getAuthState,
  setAuthState,
  subscribe,
  type AuthState,
} from "../api/authStorage";

/**
 * Claims we may find in the decoded access token. This is used purely for
 * convenience display (e.g. showing the logged-in user's email) — the backend is
 * the sole source of truth for authorization, we never trust this client-side.
 */
interface AccessTokenClaims {
  sub?: string;
  email?: string;
  exp?: number;
  [key: string]: unknown;
}

interface AuthContextValue {
  auth: AuthState | null;
  isAuthenticated: boolean;
  employeeId: string | null;
  orgId: string | null;
  role: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  registerOrganization: (
    payload: RegisterOrganizationPayload,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeEmail(accessToken: string): string | null {
  try {
    const claims = jwtDecode<AccessTokenClaims>(accessToken);
    return claims.email ?? claims.sub ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSyncExternalStore(subscribe, getAuthState, getAuthState);

  const login = useCallback(async (email: string, password: string) => {
    const payload: LoginPayload = { email, password };
    const response = await authApi.login(payload);
    setAuthState(response);
  }, []);

  const registerOrganization = useCallback(
    async (payload: RegisterOrganizationPayload) => {
      const response = await authApi.registerOrganization(payload);
      setAuthState(response);
    },
    [],
  );

  const logout = useCallback(async () => {
    const current = getAuthState();
    if (current?.refreshToken) {
      try {
        await authApi.logout(current.refreshToken);
      } catch {
        // Best-effort: even if the server call fails, clear local state so the
        // user is logged out of this device.
      }
    }
    clearAuthState();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isAuthenticated: auth !== null,
      employeeId: auth?.employeeId ?? null,
      orgId: auth?.orgId ?? null,
      role: auth?.role ?? null,
      email: auth?.accessToken ? decodeEmail(auth.accessToken) : null,
      login,
      registerOrganization,
      logout,
    }),
    [auth, login, registerOrganization, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
