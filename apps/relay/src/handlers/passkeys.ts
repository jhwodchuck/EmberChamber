import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { z } from "zod";
import { requireAuth, parseClientMetadata } from "../middleware/auth";
import { blindIndex, normalizeEmail } from "../lib/crypto";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { createSession } from "../services/session";
import { accountUsername } from "../services/utils";
import type { Env } from "../types";

const RP_NAME = "EmberChamber";
const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function uint8ArrayToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64urlToUint8Array(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLen);
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function accountIdToUserHandle(accountId: string): Uint8Array<ArrayBuffer> {
  const hex = accountId.replace(/-/g, "");
  const buf = new ArrayBuffer(16);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

const passkeyResponseShape = z.object({
  id: z.string().min(16),
  rawId: z.string(),
  response: z.record(z.unknown()),
  authenticatorAttachment: z.string().optional(),
  clientExtensionResults: z.record(z.unknown()).optional(),
  type: z.literal("public-key"),
});

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/v1/passkeys/register/options") {
    const auth = await requireAuth(request, env);

    const existingCreds = await dbAll<{
      credential_id: string;
      transports_json: string;
    }>(
      env.DB,
      `SELECT credential_id, transports_json FROM passkeys WHERE account_id = ?1`,
      auth.accountId,
    );

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: env.PASSKEY_RPID,
      userName: accountUsername(auth.accountId),
      userID: accountIdToUserHandle(auth.accountId),
      attestationType: "none",
      excludeCredentials: existingCreds.map((c) => ({
        id: c.credential_id,
        transports: JSON.parse(c.transports_json) as AuthenticatorTransportFuture[],
      })),
    });

    const challengeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    await dbRun(
      env.DB,
      `INSERT INTO passkey_challenges (id, account_id, challenge, kind, expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      challengeId,
      auth.accountId,
      options.challenge,
      "register",
      expiresAt,
      now,
    );

    return json(options);
  }

  if (request.method === "POST" && pathname === "/v1/passkeys/register/verify") {
    const auth = await requireAuth(request, env);
    const body = z.object({ response: passkeyResponseShape }).parse(await readJson(request));
    const registrationResponse = body.response as unknown as RegistrationResponseJSON;

    const challenge = await dbFirst<{ id: string; challenge: string }>(
      env.DB,
      `SELECT id, challenge FROM passkey_challenges
       WHERE account_id = ?1 AND kind = ?2 AND expires_at > ?3
       ORDER BY created_at DESC LIMIT 1`,
      auth.accountId,
      "register",
      new Date().toISOString(),
    );
    if (!challenge) {
      throw new HttpError(410, "No pending registration challenge", "CHALLENGE_EXPIRED");
    }

    let verifyResult: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verifyResult = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: challenge.challenge,
        expectedOrigin: env.PASSKEY_ORIGIN,
        expectedRPID: env.PASSKEY_RPID,
      });
    } catch (err) {
      throw new HttpError(
        400,
        err instanceof Error ? err.message : "Registration verification failed",
        "VERIFICATION_FAILED",
      );
    }

    if (!verifyResult.verified || !verifyResult.registrationInfo) {
      throw new HttpError(400, "Registration could not be verified", "VERIFICATION_FAILED");
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verifyResult.registrationInfo;

    const duplicate = await dbFirst<{ id: string }>(
      env.DB,
      `SELECT id FROM passkeys WHERE credential_id = ?1`,
      credential.id,
    );
    if (duplicate) {
      throw new HttpError(409, "Credential already registered", "CREDENTIAL_DUPLICATE");
    }

    const now = new Date().toISOString();
    const passkeyId = crypto.randomUUID();
    await dbRun(
      env.DB,
      `INSERT INTO passkeys
         (id, account_id, credential_id, public_key, transports_json, counter,
          device_type, backed_up, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      passkeyId,
      auth.accountId,
      credential.id,
      uint8ArrayToBase64url(credential.publicKey),
      JSON.stringify(credential.transports ?? []),
      credential.counter,
      credentialDeviceType,
      credentialBackedUp ? 1 : 0,
      now,
    );

    await dbRun(env.DB, `DELETE FROM passkey_challenges WHERE id = ?1`, challenge.id);

    return json({ enrolled: true, credentialId: credential.id });
  }

  if (request.method === "POST" && pathname === "/v1/passkeys/auth/options") {
    const body = z
      .object({ accountHint: z.string().optional() })
      .parse(await readJson(request));

    let allowCredentials:
      | { id: string; transports: AuthenticatorTransportFuture[] }[]
      | undefined;

    if (body.accountHint) {
      let accountId: string | null = null;
      if (body.accountHint.includes("@")) {
        const index = await blindIndex(
          env.EMBERCHAMBER_EMAIL_INDEX_SECRET,
          normalizeEmail(body.accountHint),
        );
        const match = await dbFirst<{ account_id: string }>(
          env.DB,
          `SELECT account_id FROM account_emails WHERE email_blind_index = ?1`,
          index,
        );
        accountId = match?.account_id ?? null;
      } else {
        const match = await dbFirst<{ id: string }>(
          env.DB,
          `SELECT id FROM accounts WHERE id = ?1`,
          body.accountHint,
        );
        accountId = match?.id ?? null;
      }

      if (accountId) {
        const creds = await dbAll<{
          credential_id: string;
          transports_json: string;
        }>(
          env.DB,
          `SELECT credential_id, transports_json FROM passkeys WHERE account_id = ?1`,
          accountId,
        );
        allowCredentials = creds.map((c) => ({
          id: c.credential_id,
          transports: JSON.parse(c.transports_json) as AuthenticatorTransportFuture[],
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: env.PASSKEY_RPID,
      ...(allowCredentials !== undefined ? { allowCredentials } : {}),
    });

    const challengeToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
    await dbRun(
      env.DB,
      `INSERT INTO passkey_challenges (id, account_id, challenge, kind, expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      challengeToken,
      null,
      options.challenge,
      "authenticate",
      expiresAt,
      now,
    );

    return json({ challengeToken, options });
  }

  if (request.method === "POST" && pathname === "/v1/passkeys/auth/verify") {
    const body = z
      .object({
        challengeToken: z.string().uuid(),
        deviceLabel: z.string().min(1).max(64).optional(),
        response: passkeyResponseShape,
      })
      .parse(await readJson(request));
    const authResponse = body.response as unknown as AuthenticationResponseJSON;

    const challenge = await dbFirst<{ id: string; challenge: string }>(
      env.DB,
      `SELECT id, challenge FROM passkey_challenges
       WHERE id = ?1 AND kind = ?2 AND expires_at > ?3`,
      body.challengeToken,
      "authenticate",
      new Date().toISOString(),
    );
    if (!challenge) {
      throw new HttpError(410, "Challenge not found or expired", "CHALLENGE_EXPIRED");
    }

    const storedCredential = await dbFirst<{
      id: string;
      account_id: string;
      credential_id: string;
      public_key: string;
      counter: number;
      transports_json: string;
    }>(
      env.DB,
      `SELECT id, account_id, credential_id, public_key, counter, transports_json
       FROM passkeys WHERE credential_id = ?1`,
      authResponse.id,
    );
    if (!storedCredential) {
      throw new HttpError(401, "Unknown credential", "UNKNOWN_CREDENTIAL");
    }

    let verifyResult: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verifyResult = await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge: challenge.challenge,
        expectedOrigin: env.PASSKEY_ORIGIN,
        expectedRPID: env.PASSKEY_RPID,
        credential: {
          id: storedCredential.credential_id,
          publicKey: base64urlToUint8Array(storedCredential.public_key),
          counter: storedCredential.counter,
          transports: JSON.parse(
            storedCredential.transports_json,
          ) as AuthenticatorTransportFuture[],
        },
      });
    } catch (err) {
      throw new HttpError(
        401,
        err instanceof Error ? err.message : "Authentication verification failed",
        "VERIFICATION_FAILED",
      );
    }

    if (!verifyResult.verified) {
      throw new HttpError(401, "Authentication could not be verified", "VERIFICATION_FAILED");
    }

    const now = new Date().toISOString();
    await dbRun(
      env.DB,
      `UPDATE passkeys SET counter = ?1, last_used_at = ?2 WHERE id = ?3`,
      verifyResult.authenticationInfo.newCounter,
      now,
      storedCredential.id,
    );
    await dbRun(env.DB, `DELETE FROM passkey_challenges WHERE id = ?1`, challenge.id);

    const deviceId = crypto.randomUUID();
    const deviceLabel = body.deviceLabel ?? "Passkey device";
    await dbRun(
      env.DB,
      "INSERT INTO devices (id, account_id, device_label, created_at) VALUES (?1, ?2, ?3, ?4)",
      deviceId,
      storedCredential.account_id,
      deviceLabel,
      now,
    );

    const session = await createSession(
      env,
      storedCredential.account_id,
      deviceId,
      null,
      parseClientMetadata(request),
    );

    return json(session);
  }

  const passkeyDeleteMatch = pathname.match(
    /^\/v1\/me\/passkeys\/([A-Za-z0-9_=-]{16,300})$/,
  );
  if (request.method === "DELETE" && passkeyDeleteMatch) {
    const auth = await requireAuth(request, env);
    const credentialId = passkeyDeleteMatch[1];

    const row = await dbFirst<{ id: string }>(
      env.DB,
      `SELECT id FROM passkeys WHERE credential_id = ?1 AND account_id = ?2`,
      credentialId,
      auth.accountId,
    );
    if (!row) {
      throw new HttpError(404, "Passkey not found", "NOT_FOUND");
    }

    await dbRun(env.DB, `DELETE FROM passkeys WHERE id = ?1`, row.id);

    return json({ removed: true });
  }

  return null;
}
