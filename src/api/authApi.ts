import { axiosInstance } from "./axiosInstance";
import type { AuthState } from "./authStorage";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterOrganizationPayload {
  organizationName: string;
  subdomain: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

/** The auth endpoints all return the same shape: fresh tokens + basic identity claims. */
export type AuthResponse = AuthState;

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>(
    "/auth/login",
    payload,
  );
  return response.data;
}

export async function registerOrganization(
  payload: RegisterOrganizationPayload,
): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>(
    "/auth/register-organization",
    payload,
  );
  return response.data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/refresh", {
    refreshToken,
  });
  return response.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await axiosInstance.post("/auth/logout", { refreshToken });
}
