import { decodeJson, encodeJson } from "./base64url";
import { signValue } from "./crypto";

export interface AccessTokenPayload {
  sub: string;
  deviceId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

export async function signAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
  secret: string,
  ttlSeconds = 15 * 60,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AccessTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const encoded = encodeJson(fullPayload);
  const signature = await signValue(secret, encoded);
  return `${encoded}.${signature}`;
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload | null> {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = await signValue(secret, encoded);
  if (expected !== signature) {
    return null;
  }

  const payload = decodeJson<AccessTokenPayload>(encoded);
  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return payload;
}
