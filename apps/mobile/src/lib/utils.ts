import { Platform } from "react-native";
import type { InviteReference } from "../types";

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function suggestMobileDeviceLabel() {
  if (Platform.OS === "android") {
    return "Android phone";
  }

  if (Platform.OS === "ios") {
    return "iPhone";
  }

  return "Mobile device";
}

export function makeOpaqueToken() {
  const randomSegment = () => Math.random().toString(36).slice(2, 18);
  const cryptoUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);

  if (cryptoUuid) {
    return `${cryptoUuid().replace(/-/g, "")}${cryptoUuid().replace(/-/g, "")}`;
  }

  return `${Date.now().toString(36)}${randomSegment()}${randomSegment()}${randomSegment()}`;
}

export function extractCompletionTokenFromUrl(input: string): string | null {
  try {
    const parsed = new URL(input);
    const token = parsed.searchParams.get("token");
    if (!token) {
      return null;
    }

    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (
      path === "/auth/complete" ||
      (host === "auth" && path === "/complete") ||
      input.toLowerCase().includes("auth/complete")
    ) {
      return token;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeInviteReference(value: string): InviteReference | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const inviteIndex = segments.findIndex((segment) => segment === "invite");
    if (inviteIndex >= 0 && segments.length >= inviteIndex + 3) {
      return {
        groupId: segments[inviteIndex + 1] ?? "",
        inviteToken: segments[inviteIndex + 2] ?? "",
      };
    }

    if (url.host === "invite" && segments.length >= 2) {
      return {
        groupId: segments[0] ?? "",
        inviteToken: segments[1] ?? "",
      };
    }
  } catch {
    // Fall through to raw parsing.
  }

  const slashParts = trimmed.split("/").filter(Boolean);
  if (slashParts.length >= 2) {
    return {
      groupId: slashParts[slashParts.length - 2] ?? "",
      inviteToken: slashParts[slashParts.length - 1] ?? "",
    };
  }

  const colonParts = trimmed.split(":");
  if (colonParts.length === 2) {
    return {
      groupId: colonParts[0] ?? "",
      inviteToken: colonParts[1] ?? "",
    };
  }

  return null;
}

export function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

export function deviceBundleStorageKey(deviceId: string) {
  return `emberchamber.auth.v1.deviceBundle.${deviceId}`;
}

export function createPlaceholderDeviceBundle() {
  return {
    identityKeyB64: makeOpaqueToken(),
    signedPrekeyB64: makeOpaqueToken(),
    signedPrekeySignatureB64: makeOpaqueToken(),
    oneTimePrekeysB64: Array.from({ length: 12 }, () => makeOpaqueToken()),
  };
}
