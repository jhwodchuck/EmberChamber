import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "change-me-refresh-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "30d";

export interface AccessTokenPayload {
  sub: string; // userId
  sessionId: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: "refresh";
}

export function signAccessToken(userId: string, sessionId: string): string {
  return jwt.sign(
    { sub: userId, sessionId, type: "access" } satisfies AccessTokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

export function signRefreshToken(userId: string, sessionId: string): string {
  return jwt.sign(
    { sub: userId, sessionId, type: "refresh" } satisfies RefreshTokenPayload,
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
  if (payload.type !== "access") throw new Error("Invalid token type");
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(
    token,
    JWT_REFRESH_SECRET
  ) as RefreshTokenPayload;
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return payload;
}

export function generateRefreshTokenString(): string {
  return uuidv4() + "." + crypto.randomBytes(32).toString("hex");
}

export function generateInviteCode(): string {
  return crypto.randomBytes(8).toString("hex");
}
