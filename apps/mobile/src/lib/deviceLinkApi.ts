import type { DeviceLinkQrMode, DeviceLinkStatus } from "@emberchamber/protocol";
import type { AuthSession } from "../types";
import { relayUrl } from "../constants";
import { fetchRelayJson } from "./relayClient";

export function claimDeviceLinkRequest(input: {
  qrPayload: string;
  deviceLabel: string;
}) {
  return fetchRelayJson<DeviceLinkStatus>(`${relayUrl}/v1/devices/link/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function completeDeviceLinkRequest(input: {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
}) {
  return fetchRelayJson<AuthSession>(`${relayUrl}/v1/devices/link/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchDeviceLinkStatusRequest(input: {
  linkToken: string;
  qrMode: DeviceLinkQrMode;
}) {
  return fetchRelayJson<DeviceLinkStatus>(
    `${relayUrl}/v1/devices/link/status?token=${encodeURIComponent(
      input.linkToken,
    )}&qrMode=${encodeURIComponent(input.qrMode)}`,
  );
}
