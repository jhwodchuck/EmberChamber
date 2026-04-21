import { Platform } from "react-native";
import type { AuthSession } from "../types";
import { ensurePushRuntimeConfiguredAsync, getNativeDevicePushRegistrationAsync } from "./push";

type RelayFetch = <T>(
  session: AuthSession,
  path: string,
  init?: RequestInit,
) => Promise<T>;

export async function registerNativePushToken(
  currentSession: AuthSession,
  relayFetch: RelayFetch,
) {
  await ensurePushRuntimeConfiguredAsync();
  const registration = await getNativeDevicePushRegistrationAsync();

  if (!registration) {
    try {
      await relayFetch<{ cleared: boolean }>(
        currentSession,
        "/v1/devices/push-token",
        {
          method: "DELETE",
        },
      );
    } catch {
      // Ignore cleanup errors if push was never registered server-side.
    }
    return false;
  }

  await relayFetch<{ registered: boolean }>(
    currentSession,
    "/v1/devices/push-token",
    {
      method: "POST",
      body: JSON.stringify({
        ...registration,
        appId:
          Platform.OS === "android"
            ? "com.emberchamber.mobile"
            : "com.emberchamber.mobile.ios",
        pushEnvironment: "production",
      }),
    },
  );

  return true;
}

export async function clearNativePushToken(
  currentSession: AuthSession,
  relayFetch: RelayFetch,
) {
  await relayFetch<{ cleared: boolean }>(
    currentSession,
    "/v1/devices/push-token",
    {
      method: "DELETE",
    },
  );
}

export async function syncRefreshedPushToken(
  currentSession: AuthSession,
  relayFetch: RelayFetch,
  token: { type: string; data: string },
) {
  const provider =
    token.type === "fcm" ? "fcm" : token.type === "apns" ? "apns" : null;
  if (!provider) {
    return;
  }

  await relayFetch<{ registered: boolean }>(
    currentSession,
    "/v1/devices/push-token",
    {
      method: "POST",
      body: JSON.stringify({
        provider,
        platform: Platform.OS === "android" ? "android" : "ios",
        token: token.data,
        appId:
          Platform.OS === "android"
            ? "com.emberchamber.mobile"
            : "com.emberchamber.mobile.ios",
        pushEnvironment: "production",
      }),
    },
  );
}
