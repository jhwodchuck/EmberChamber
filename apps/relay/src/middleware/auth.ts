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

  const session = await dbFirst<{ id: string }>(
    env.DB,
    `SELECT id
       FROM sessions
      WHERE id = ?1
        AND account_id = ?2
        AND device_id = ?3
        AND revoked_at IS NULL
        AND expires_at > ?4`,
    payload.sessionId,
    payload.sub,
    payload.deviceId,
    new Date().toISOString(),
  );

  if (!session) {
    throw new HttpError(401, "Session expired", "SESSION_EXPIRED");
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
