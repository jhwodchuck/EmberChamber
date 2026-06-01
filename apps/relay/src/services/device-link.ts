import type { DeviceLinkStatus } from "@emberchamber/protocol";
import { dbFirst } from "../lib/d1";
import { sha256Hex } from "../lib/crypto";
import type { Env, DeviceLinkRow } from "../types";

export function relayPublicOrigin(env: Env) {
  return new URL(env.EMBERCHAMBER_RELAY_PUBLIC_URL).origin;
}

export async function hashDeviceLinkToken(linkToken: string) {
  return sha256Hex(`device-link:${linkToken}`);
}

export async function findDeviceLinkByToken(env: Env, linkToken: string) {
  return dbFirst<DeviceLinkRow>(
    env.DB,
    `SELECT
       id,
       account_id,
       requester_label,
       qr_mode,
       created_at,
       expires_at,
       claimed_at,
       approved_at,
       approved_by_device_id,
       consumed_at,
       completed_device_id,
       completed_session_id
     FROM device_links
    WHERE link_token_hash = ?1`,
    await hashDeviceLinkToken(linkToken),
  );
}

export function getDeviceLinkState(row: DeviceLinkRow): DeviceLinkStatus["state"] {
  const now = new Date().toISOString();
  if (row.expires_at <= now) {
    return "expired";
  }
  if (row.consumed_at) {
    return "consumed";
  }
  if (!row.claimed_at) {
    return row.qr_mode === "target_display"
      ? "waiting_for_source"
      : "pending_claim";
  }
  if (!row.approved_at) {
    return "pending_approval";
  }
  return "approved";
}

export function buildDeviceLinkStatus(env: Env, row: DeviceLinkRow): DeviceLinkStatus {
  const state = getDeviceLinkState(row);
  return {
    linkId: row.id,
    relayOrigin: relayPublicOrigin(env),
    qrMode: row.qr_mode,
    state,
    requesterLabel: row.requester_label,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    approvedAt: row.approved_at,
    approvedByDeviceId: row.approved_by_device_id,
    consumedAt: row.consumed_at,
    completedDeviceId: row.completed_device_id,
    completedSessionId: row.completed_session_id,
    canComplete: state === "approved",
  };
}
