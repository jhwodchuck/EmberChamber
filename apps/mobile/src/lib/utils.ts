import { Platform } from "react-native";
import { createStoredDeviceBundle } from "@emberchamber/protocol";
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
  const cryptoObject = globalThis.crypto;
  const cryptoUuid = cryptoObject?.randomUUID?.bind(cryptoObject);

  if (cryptoUuid) {
    return `${cryptoUuid().replace(/-/g, "")}${cryptoUuid().replace(/-/g, "")}`;
  }

  if (cryptoObject?.getRandomValues) {
    return bytesToHex(cryptoObject.getRandomValues(new Uint8Array(24)));
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 26)}`;
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

export function createDeviceBundleScaffold() {
  return createStoredDeviceBundle();
}

export function isDefaultDisplayName(value: string) {
  return /^Member [0-9a-f]{8}$/i.test(value.trim());
}

function randomBase64(byteLength: number) {
  const cryptoObject = globalThis.crypto;
  const bytes = new Uint8Array(byteLength);

  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(bytes);
    return encodeBase64(bytes);
  }

  return makeOpaqueToken();
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function encodeBase64(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index] ?? 0;
    const byte2 = bytes[index + 1] ?? 0;
    const byte3 = bytes[index + 2] ?? 0;
    const combined = (byte1 << 16) | (byte2 << 8) | byte3;

    output += alphabet[(combined >> 18) & 63];
    output += alphabet[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[combined & 63] : "=";
  }

  return output;
}
