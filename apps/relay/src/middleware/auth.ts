import type { Env, AuthContext, ClientMetadata } from "../types";
import { clientHeaderNames } from "../types";
import { HttpError } from "../lib/http";
import { verifyAccessToken } from "../lib/tokens";
import { dbFirst } from "../lib/d1";
import { touchSession } from "../services/session";

export async function requireAuth(request: Request, env: Env): Promise<AuthContext> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token", "UNAUTHENTICATED");
  }

  return requireAccessTokenSession(
    authorization.slice("Bearer ".length),
    env,
    parseClientMetadata(request),
  );
}

export async function requireAdmin(request: Request, env: Env): Promise<void> {
  const adminSecret = env.EMBERCHAMBER_ADMIN_SECRET;
  if (!adminSecret) {
    throw new HttpError(404, "Not found", "NOT_FOUND");
  }

  if (request.headers.get("authorization") !== `Bearer ${adminSecret}`) {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }
}

// Operator gating for the browser-based admin surface: a normal authenticated
// session whose account carries the is_operator flag. Distinct from requireAdmin,
// which guards shared-secret/CLI break-glass endpoints.
export async function requireOperator(
  request: Request,
  env: Env,
): Promise<AuthContext> {
  const auth = await requireAuth(request, env);
  const account = await dbFirst<{ is_operator: number }>(
    env.DB,
    `SELECT is_operator FROM accounts WHERE id = ?1`,
    auth.accountId,
  );

  if (!account || account.is_operator !== 1) {
    throw new HttpError(403, "Operator access required", "NOT_OPERATOR");
  }

  return auth;
}

export async function requireAccessTokenSession(
  token: string,
  env: Env,
  clientMetadata?: ClientMetadata | null,
): Promise<AuthContext> {
  const payload = await verifyAccessToken(
    token,
    env.EMBERCHAMBER_ACCESS_TOKEN_SECRET,
  );
  if (!payload) {
    throw new HttpError(401, "Invalid access token", "INVALID_ACCESS_TOKEN");
  }

  const session = await dbFirst<{ id: string; suspended_at: string | null }>(
    env.DB,
    `SELECT s.id, a.suspended_at
       FROM sessions s
       JOIN accounts a ON a.id = s.account_id
      WHERE s.id = ?1
        AND s.account_id = ?2
        AND s.device_id = ?3
        AND s.revoked_at IS NULL
        AND s.expires_at > ?4`,
    payload.sessionId,
    payload.sub,
    payload.deviceId,
    new Date().toISOString(),
  );

  if (!session) {
    throw new HttpError(401, "Session expired", "SESSION_EXPIRED");
  }

  if (session.suspended_at !== null) {
    throw new HttpError(403, "Account suspended", "SUSPENDED");
  }

  if (clientMetadata) {
    await touchSession(env, payload.sessionId, clientMetadata);
  }

  return {
    accountId: payload.sub,
    deviceId: payload.deviceId,
    sessionId: payload.sessionId,
  };
}

export function parseClientMetadata(request: Request): ClientMetadata {
  return {
    clientPlatform: readOptionalHeader(
      request,
      clientHeaderNames.clientPlatform,
      24,
    ),
    clientVersion: readOptionalHeader(
      request,
      clientHeaderNames.clientVersion,
      32,
    ),
    clientBuild: readOptionalHeader(request, clientHeaderNames.clientBuild, 24),
    deviceModel: readOptionalHeader(
      request,
      clientHeaderNames.deviceModel,
      120,
    ),
  };
}

export function readOptionalHeader(
  request: Request,
  headerName: string,
  maxLength: number,
) {
  const raw = request.headers.get(headerName)?.trim();
  if (!raw) {
    return null;
  }

  return raw.slice(0, maxLength);
}
