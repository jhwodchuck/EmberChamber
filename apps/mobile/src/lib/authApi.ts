import { relayUrl } from "../constants";
import type { AuthSession, MagicLinkResponse } from "../types";
import { fetchRelayJson } from "./relayClient";

export type StartMagicLinkInput = {
  email: string;
  inviteToken?: string;
  groupId?: string;
  groupInviteToken?: string;
  deviceLabel: string;
  ageConfirmed18: true;
};

export type RefreshSessionResponse = Pick<
  AuthSession,
  "accessToken" | "deviceId" | "sessionId"
>;

export function startMagicLinkRequest(input: StartMagicLinkInput) {
  return fetchRelayJson<MagicLinkResponse>(`${relayUrl}/v1/auth/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function completeMagicLinkRequest(input: {
  completionToken: string;
  deviceLabel?: string;
}) {
  return fetchRelayJson<AuthSession>(`${relayUrl}/v1/auth/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function requestRelaySessionRefresh(refreshToken: string) {
  return fetchRelayJson<RefreshSessionResponse>(`${relayUrl}/v1/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}
