import type { Env, ClientMetadata } from "../types";
import { dbFirst, dbRun } from "../lib/d1";
import { sha256Hex } from "../lib/crypto";
import { signAccessToken } from "../lib/tokens";

export const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
export const sessionRefreshRecoveryWindowMs = 90 * 24 * 60 * 60 * 1000;

export function nextSessionExpiresAt() {
  return new Date(Date.now() + sessionTtlMs).toISOString();
}

export function isSessionWithinRefreshRecoveryWindow(lastSeenAt: string) {
  const lastSeenMs = Date.parse(lastSeenAt);
  return (
    Number.isFinite(lastSeenMs) &&
    lastSeenMs >= Date.now() - sessionRefreshRecoveryWindowMs
  );
}

export async function touchSession(
  env: Env,
  sessionId: string,
  clientMetadata: ClientMetadata,
  expiresAt?: string | null,
) {
  const now = new Date().toISOString();
  await dbRun(
    env.DB,
    `UPDATE sessions
        SET last_seen_at = ?2,
            expires_at = COALESCE(?3, expires_at),
            client_platform = COALESCE(?4, client_platform),
            client_version = COALESCE(?5, client_version),
            client_build = COALESCE(?6, client_build),
            device_model = COALESCE(?7, device_model)
      WHERE id = ?1`,
    sessionId,
    now,
    expiresAt ?? null,
    clientMetadata.clientPlatform,
    clientMetadata.clientVersion,
    clientMetadata.clientBuild,
    clientMetadata.deviceModel,
  );
}

export async function isExistingAccount(
  env: Env,
  emailBlindIndex: string,
): Promise<boolean> {
  const row = await dbFirst<{ account_id: string }>(
    env.DB,
    "SELECT account_id FROM account_emails WHERE email_blind_index = ?1",
    emailBlindIndex,
  );
  return Boolean(row);
}

export async function createSession(
  env: Env,
  accountId: string,
  deviceId: string,
  bootstrapConversation?: { conversationId: string; title: string } | null,
  clientMetadata?: ClientMetadata | null,
) {
  const sessionId = crypto.randomUUID();
  const refreshToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const refreshTokenHash = await sha256Hex(`refresh:${refreshToken}`);
  const expiresAt = nextSessionExpiresAt();

  await dbRun(
    env.DB,
    `INSERT INTO sessions (
       id,
       account_id,
       device_id,
       refresh_token_hash,
       expires_at,
       created_at,
       last_seen_at,
       client_platform,
       client_version,
       client_build,
       device_model
     )
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?8, ?9, ?10)`,
    sessionId,
    accountId,
    deviceId,
    refreshTokenHash,
    expiresAt,
    new Date().toISOString(),
    clientMetadata?.clientPlatform ?? null,
    clientMetadata?.clientVersion ?? null,
    clientMetadata?.clientBuild ?? null,
    clientMetadata?.deviceModel ?? null,
  );

  const accessToken = await signAccessToken(
    { sub: accountId, deviceId, sessionId },
    env.EMBERCHAMBER_ACCESS_TOKEN_SECRET,
  );

  return {
    accountId,
    deviceId,
    sessionId,
    accessToken,
    refreshToken,
    expiresAt,
    passkeyEnrollmentSuggested: false,
    bootstrapConversationId: bootstrapConversation?.conversationId,
    bootstrapConversationTitle: bootstrapConversation?.title,
  };
}
