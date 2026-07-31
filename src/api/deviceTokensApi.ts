import { axiosInstance } from "./axiosInstance";

export type DevicePlatform = "WEB" | "ANDROID" | "IOS";

export async function registerDeviceToken(
  token: string,
  platform: DevicePlatform,
): Promise<void> {
  await axiosInstance.post("/device-tokens", { token, platform });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await axiosInstance.delete(`/device-tokens/${encodeURIComponent(token)}`);
}
