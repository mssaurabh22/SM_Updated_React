/**
 * Persists the authentication state (tokens + basic identity claims) to localStorage
 * under a single namespaced key, and exposes a tiny pub-sub so that both the axios
 * interceptor (outside the React tree) and React components (via AuthContext, using
 * useSyncExternalStore) always observe the same, current state.
 */

const STORAGE_KEY = "salesmanager.auth";

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  employeeId: string;
  orgId: string;
  role: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// useSyncExternalStore requires getSnapshot to return a referentially stable value
// when the underlying data hasn't changed (it compares snapshots with Object.is).
// Re-parsing JSON on every call would return a new object every time even when
// localStorage hasn't changed, making React think the store changes on every render -
// an infinite render loop ("Maximum update depth exceeded"). Caching keyed on the raw
// string keeps the same object reference until the stored value actually changes.
let cachedRaw: string | null = null;
let cachedState: AuthState | null = null;

export function getAuthState(): AuthState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedState;
  }
  cachedRaw = raw;
  if (!raw) {
    cachedState = null;
    return null;
  }
  try {
    cachedState = JSON.parse(raw) as AuthState;
  } catch {
    cachedState = null;
  }
  return cachedState;
}

export function setAuthState(state: AuthState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  notify();
}

export function clearAuthState(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  notify();
}
