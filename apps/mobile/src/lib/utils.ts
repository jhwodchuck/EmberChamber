import { Platform } from "react-native";
import { createStoredDeviceBundle } from "@emberchamber/protocol";
import type { InviteReference } from "../types";

type NativePlatformConstants = Partial<{
  Brand: string;
  Manufacturer: string;
  Model: string;
}>;

export type SharedLocationPreview = {
  title: string;
  isLive: boolean;
  latitude: number;
  longitude: number;
  mapUrl: string;
  accuracyMeters: number | null;
  coordinateLabel: string;
  detailLabel: string;
  tileUrl: string;
  markerLeftPercent: number;
  markerTopPercent: number;
};

const LEGACY_DEFAULT_DEVICE_LABELS = new Set(["Android phone", "iPhone", "Mobile device"]);

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isLegacySuggestedDeviceLabel(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return !trimmed || LEGACY_DEFAULT_DEVICE_LABELS.has(trimmed);
}

export function getMobileDeviceModel() {
  const constants = (Platform.constants ?? {}) as NativePlatformConstants;
  const brand = cleanDeviceLabelPart(constants.Brand || constants.Manufacturer);
  const model = cleanDeviceLabelPart(constants.Model);

  if (Platform.OS === "android") {
    if (brand && model) {
      const brandLower = brand.toLowerCase();
      const modelLower = model.toLowerCase();
      return modelLower.startsWith(brandLower) ? model : `${brand} ${model}`;
    }

    return model || brand || null;
  }

  if (Platform.OS === "ios") {
    return model || "iPhone";
  }

  return model || brand || null;
}

export function suggestMobileDeviceLabel() {
  const nativeModel = getMobileDeviceModel();
  if (nativeModel) {
    return nativeModel;
  }

  if (Platform.OS === "android") {
    return "Android phone";
  }

  if (Platform.OS === "ios") {
    return "iPhone";
  }

  return "Mobile device";
}

export function parseSharedLocation(value: string): SharedLocationPreview | null {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return null;
  }

  const titleLine = lines[0] ?? "";
  const urlLine = lines.find((line) => /^https?:\/\//i.test(line)) ?? null;
  const decimalCoordinates = urlLine ? parseCoordinatesFromUrl(urlLine) : null;
  const cardinalCoordinates = parseCardinalCoordinates(lines.join(" "));
  const coordinates = decimalCoordinates ?? cardinalCoordinates;

  if (!coordinates) {
    return null;
  }

  const latitude = clampLatitude(coordinates.latitude);
  const longitude = clampLongitude(coordinates.longitude);
  const accuracyMatch = lines.find((line) => /^Accuracy:/i.test(line))?.match(/(\d+(?:\.\d+)?)/);
  const accuracyMeters = accuracyMatch ? Math.round(Number(accuracyMatch[1])) : null;
  const isLive = /live location/i.test(titleLine);
  const title = titleLine.replace(/^📍\s*/u, "").replace(/\s*\(.+\)\s*$/, "").trim()
    || (isLive ? "Live location" : "Location");
  const coordinateLabel =
    lines.find((line) => /°\s*[NS],\s*\d+(?:\.\d+)?°\s*[EW]/i.test(line))
    ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  const detailLabel = accuracyMeters ? `${coordinateLabel} • ±${accuracyMeters} m` : coordinateLabel;
  const tilePreview = buildTilePreview(latitude, longitude, 14);

  return {
    title,
    isLive,
    latitude,
    longitude,
    mapUrl: urlLine ?? `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    accuracyMeters,
    coordinateLabel,
    detailLabel,
    tileUrl: tilePreview.tileUrl,
    markerLeftPercent: tilePreview.markerLeftPercent,
    markerTopPercent: tilePreview.markerTopPercent,
  };
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

function cleanDeviceLabelPart(value: string | undefined) {
  const trimmed = value?.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ") ?? "";
  if (!trimmed) {
    return "";
  }

  if (
    /^(android sdk built for x86|sdk|sdk gphone|sdk_gphone|generic|emulator|google_sdk)/i.test(
      trimmed,
    )
  ) {
    return "";
  }

  return trimmed;
}

function parseCoordinatesFromUrl(value: string) {
  try {
    const parsed = new URL(value);
    const query = parsed.searchParams.get("q") ?? parsed.searchParams.get("query");
    if (!query) {
      return null;
    }

    const match = query.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (!match) {
      return null;
    }

    return {
      latitude: Number(match[1]),
      longitude: Number(match[2]),
    };
  } catch {
    return null;
  }
}

function parseCardinalCoordinates(value: string) {
  const match = value.match(
    /(\d+(?:\.\d+)?)°\s*([NS])\s*,\s*(\d+(?:\.\d+)?)°\s*([EW])/i,
  );
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]) * (match[2]?.toUpperCase() === "S" ? -1 : 1);
  const longitude = Number(match[3]) * (match[4]?.toUpperCase() === "W" ? -1 : 1);
  return { latitude, longitude };
}

function buildTilePreview(latitude: number, longitude: number, zoom: number) {
  const latRadians = (latitude * Math.PI) / 180;
  const scale = 2 ** zoom;
  const worldX = ((longitude + 180) / 360) * scale;
  const worldY =
    ((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) * scale;
  const tileX = Math.floor(worldX);
  const tileY = Math.floor(worldY);

  return {
    tileUrl: `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`,
    markerLeftPercent: clampPercent((worldX - tileX) * 100),
    markerTopPercent: clampPercent((worldY - tileY) * 100),
  };
}

function clampLatitude(value: number) {
  return Math.max(-85, Math.min(85, value));
}

function clampLongitude(value: number) {
  return Math.max(-180, Math.min(180, value));
}

function clampPercent(value: number) {
  return Math.max(8, Math.min(92, value));
}
