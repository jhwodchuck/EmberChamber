import { Platform } from "react-native";
import { relayUrl } from "../constants";
import type { AuthSession, RelayErrorResponse } from "../types";
import { getMobileDeviceModel } from "./utils";

const appConfig = require("../../app.json") as {
  expo?: {
    version?: string;
    android?: { versionCode?: number };
    ios?: { buildNumber?: string };
  };
};

export function buildRelayClientHeaders() {
  const appVersion = appConfig.expo?.version?.trim() || "0.1.0";
  const buildVersion =
    Platform.OS === "android"
      ? String(appConfig.expo?.android?.versionCode ?? "")
      : String(appConfig.expo?.ios?.buildNumber ?? "");
  const deviceModel = getMobileDeviceModel();

  return {
    "x-emberchamber-client-platform": Platform.OS,
    "x-emberchamber-client-version": appVersion,
    ...(buildVersion ? { "x-emberchamber-client-build": buildVersion } : {}),
    ...(deviceModel ? { "x-emberchamber-device-model": deviceModel } : {}),
  };
}

export async function fetchRelayJson<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 15_000,
): Promise<{ response: Response; body: T & RelayErrorResponse }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init?.headers ?? {});
    Object.entries(buildRelayClientHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });

    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    const rawBody = await response.text();
    let body = {} as T & RelayErrorResponse;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as T & RelayErrorResponse;
      } catch {
        body = { error: rawBody } as T & RelayErrorResponse;
      }
    }

    return { response, body };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The relay took too long to respond. Check your connection and try again.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

type RelayFetchOptions = {
  session: AuthSession;
  path: string;
  init?: RequestInit;
  allowRefresh?: boolean;
  onRefreshSession?: (currentSession: AuthSession) => Promise<AuthSession | null>;
  baseUrl?: string;
};

export async function relayFetch<T>({
  session,
  path,
  init,
  allowRefresh = true,
  onRefreshSession,
  baseUrl = relayUrl,
}: RelayFetchOptions): Promise<T> {
  const headers = {
    authorization: `Bearer ${session.accessToken}`,
    ...(init?.body ? { "content-type": "application/json" } : {}),
    ...(init?.headers ?? {}),
  };

  const { response, body } = await fetchRelayJson<T>(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
  if (response.ok) {
    return body;
  }

  if (response.status === 401 && allowRefresh && onRefreshSession) {
    const refreshed = await onRefreshSession(session);
    if (refreshed) {
      return relayFetch<T>({
        session: refreshed,
        path,
        init,
        allowRefresh: false,
        onRefreshSession,
        baseUrl,
      });
    }
  }

  throw new Error(body.error ?? `Relay request failed: ${response.status}`);
}

export function getRelayOrigin(baseUrl = relayUrl) {
  return new URL(baseUrl).origin;
}
