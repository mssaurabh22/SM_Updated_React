import axios, { type AxiosRequestConfig } from "axios";
import { clearAuthState, getAuthState, setAuthState } from "./authStorage";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the current access token (if any) to every outgoing request.
axiosInstance.interceptors.request.use((config) => {
  const auth = getAuthState();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

// A request config augmented with our own "have we already retried this once" flag.
interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Guards against firing multiple concurrent refresh calls when several requests
// 401 at roughly the same time; every caller awaits the same in-flight promise.
let refreshPromise: Promise<string | null> | null = null;

function performRefresh(refreshToken: string): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      .then((response) => {
        setAuthState(response.data);
        return response.data.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (!originalRequest || originalRequest._retry) {
      clearAuthState();
      redirectToLogin();
      return Promise.reject(error);
    }

    const auth = getAuthState();
    if (!auth?.refreshToken) {
      clearAuthState();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const newAccessToken = await performRefresh(auth.refreshToken);

    if (!newAccessToken) {
      clearAuthState();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newAccessToken}`,
    };
    return axiosInstance(originalRequest);
  },
);
