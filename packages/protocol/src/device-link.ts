export const DEVICE_LINK_QR_PREFIX = "emberchamber-device-link:";

export type DeviceLinkQrMode = "source_display" | "target_display";
export type DeviceLinkState =
  | "waiting_for_source"
  | "pending_claim"
  | "pending_approval"
  | "approved"
  | "consumed"
  | "expired";

export interface DeviceLinkQrPayload {
  version: 1;
  relayOrigin: string;
  qrMode: DeviceLinkQrMode;
  linkToken: string;
  requesterLabel?: string;
}

export interface DeviceLinkStatus {
  linkId?: string;
  relayOrigin: string;
  qrMode: DeviceLinkQrMode;
  state: DeviceLinkState;
  requesterLabel: string;
  expiresAt: string;
  createdAt?: string;
  claimedAt?: string | null;
  approvedAt?: string | null;
  approvedByDeviceId?: string | null;
  consumedAt?: string | null;
  completedDeviceId?: string | null;
  completedSessionId?: string | null;
  canComplete: boolean;
}

export interface DeviceLinkStartRequest {
  deviceLabel?: string;
}

export interface DeviceLinkStartResponse extends DeviceLinkStatus {
  linkId: string;
  qrPayload: string;
}

export interface DeviceLinkScanRequest {
  qrPayload: string;
}

export interface DeviceLinkClaimRequest {
  qrPayload: string;
  deviceLabel: string;
}

export interface DeviceLinkStatusQuery {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
}

export interface DeviceLinkConfirmRequest {
  linkId: string;
}

export interface DeviceLinkConfirmResponse extends DeviceLinkStatus {
  linkId: string;
  confirmed: true;
}

export interface DeviceLinkCompleteRequest {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
}

const localRelayHosts = new Set(["127.0.0.1", "localhost", "10.0.2.2", "tauri.localhost"]);

function textToBase64Url(value: string): string {
  if (typeof btoa === "function") {
    return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  const nodeBuffer = (globalThis as { Buffer?: { from(input: string, encoding?: string): { toString(encoding: string): string } } }).Buffer;
  if (!nodeBuffer) {
    throw new Error("Base64 encoding is unavailable in this runtime.");
  }

  return nodeBuffer.from(value, "utf8").toString("base64url");
}

function textFromBase64Url(value: string): string {
  if (typeof atob === "function") {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    return atob(normalized + padding);
  }

  const nodeBuffer = (globalThis as { Buffer?: { from(input: string, encoding?: string): { toString(encoding: string): string } } }).Buffer;
  if (!nodeBuffer) {
    throw new Error("Base64 decoding is unavailable in this runtime.");
  }

  return nodeBuffer.from(value, "base64url").toString("utf8");
}

function defaultPort(protocol: string): string {
  return protocol === "https:" ? "443" : protocol === "http:" ? "80" : "";
}

function canonicalRelayOrigin(origin: string): string {
  const parsed = new URL(origin);
  const host = parsed.hostname.toLowerCase();
  const port = parsed.port || defaultPort(parsed.protocol);

  if (localRelayHosts.has(host)) {
    return `${parsed.protocol}//loopback:${port}`;
  }

  return `${parsed.protocol}//${host}${port ? `:${port}` : ""}`;
}

export function normalizeRelayOrigin(origin: string): string {
  return new URL(origin).origin.replace(/\/$/, "");
}

export function relayOriginsMatch(left: string, right: string): boolean {
  try {
    return canonicalRelayOrigin(left) === canonicalRelayOrigin(right);
  } catch {
    return false;
  }
}

export function createDeviceLinkToken() {
  const cryptoObject = globalThis.crypto;
  const cryptoUuid = cryptoObject?.randomUUID?.bind(cryptoObject);

  if (cryptoUuid) {
    return `${cryptoUuid()}-${cryptoUuid()}`;
  }

  if (cryptoObject?.getRandomValues) {
    const bytes = cryptoObject.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }

  throw new Error("Secure token generation is unavailable in this runtime.");
}

export function encodeDeviceLinkQrPayload(input: Omit<DeviceLinkQrPayload, "version">) {
  const payload: DeviceLinkQrPayload = {
    version: 1,
    relayOrigin: normalizeRelayOrigin(input.relayOrigin),
    qrMode: input.qrMode,
    linkToken: input.linkToken,
    ...(input.requesterLabel ? { requesterLabel: input.requesterLabel } : {}),
  };

  return `${DEVICE_LINK_QR_PREFIX}${textToBase64Url(JSON.stringify(payload))}`;
}

export function parseDeviceLinkQrPayload(value: string): DeviceLinkQrPayload {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("QR payload is empty.");
  }

  const encoded = trimmed.startsWith(DEVICE_LINK_QR_PREFIX)
    ? trimmed.slice(DEVICE_LINK_QR_PREFIX.length)
    : trimmed;
  const parsed = JSON.parse(textFromBase64Url(encoded)) as Partial<DeviceLinkQrPayload>;

  if (parsed.version !== 1) {
    throw new Error("Unsupported device-link QR version.");
  }

  if (
    (parsed.qrMode !== "source_display" && parsed.qrMode !== "target_display") ||
    typeof parsed.linkToken !== "string" ||
    parsed.linkToken.length < 16 ||
    typeof parsed.relayOrigin !== "string"
  ) {
    throw new Error("Invalid device-link QR payload.");
  }

  return {
    version: 1,
    relayOrigin: normalizeRelayOrigin(parsed.relayOrigin),
    qrMode: parsed.qrMode,
    linkToken: parsed.linkToken,
    ...(typeof parsed.requesterLabel === "string" && parsed.requesterLabel.trim()
      ? { requesterLabel: parsed.requesterLabel.trim() }
      : {}),
  };
}
