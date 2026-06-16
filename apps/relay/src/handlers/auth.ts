import { type MagicLinkChallenge } from "@emberchamber/protocol";
import { z } from "zod";
import { enforceRateLimit } from "../middleware/rate-limit";
import { parseClientMetadata } from "../middleware/auth";
import {
  authStartSchema,
  authCompleteSchema,
  inviteCheckSchema,
  resendMagicLinkSchema,
} from "../schemas";
import { blindIndex, encryptString, normalizeEmail, sha256Hex } from "../lib/crypto";
import { dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { signAccessToken } from "../lib/tokens";
import { scheduleCleanup } from "../services/cleanup";
import { hashInviteToken, resolveBootstrapAccess, acceptConversationInviteByTokenHash } from "../services/invites";
import {
  isExistingAccount,
  createSession,
  isSessionWithinRefreshRecoveryWindow,
  nextSessionExpiresAt,
  touchSession,
} from "../services/session";
import { conversationTitleForAccount, publicWebUrl } from "../services/utils";
import type { Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/auth/complete") {
    const token = url.searchParams.get("token");
    if (!token) {
      throw new HttpError(
        400,
        "Missing completion token",
        "MISSING_COMPLETION_TOKEN",
      );
    }

    const redirectUrl = `${publicWebUrl(env)}/auth/complete?token=${encodeURIComponent(token)}`;
    return Response.redirect(redirectUrl, 302);
  }

  if (request.method === "POST" && pathname === "/v1/auth/start") {
    const body = authStartSchema.parse(await readJson(request));
    const email = normalizeEmail(body.email);
    const emailBlindIndex = await blindIndex(
      env.EMBERCHAMBER_EMAIL_INDEX_SECRET,
      email,
    );
    const ip = request.headers.get("cf-connecting-ip") ?? "local";

    await enforceRateLimit(env, `auth:start:${ip}`, 10, 15 * 60 * 1000);
    await enforceRateLimit(
      env,
      `auth:start:email:${emailBlindIndex}`,
      5,
      15 * 60 * 1000,
    );

    const accountExists = await isExistingAccount(env, emailBlindIndex);
    const bootstrapAccess = await resolveBootstrapAccess(
      env,
      body,
      accountExists,
    );

    const challengeId = crypto.randomUUID();
    const completionToken = `${challengeId}.${crypto.randomUUID()}`;
    const completionTokenHash = await sha256Hex(
      `completion:${completionToken}`,
    );
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const emailCiphertext = await encryptString(
      env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET,
      email,
    );

    await dbRun(
      env.DB,
      `INSERT INTO auth_challenges (
        id, email_ciphertext, email_blind_index, invite_token_hash, completion_token_hash, expires_at, created_at, requested_device_label, pending_group_conversation_id, pending_group_invite_token_hash, age_confirmed_18
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      challengeId,
      emailCiphertext,
      emailBlindIndex,
      bootstrapAccess.betaInviteHash,
      completionTokenHash,
      expiresAt,
      new Date().toISOString(),
      body.deviceLabel,
      bootstrapAccess.pendingGroupConversationId,
      bootstrapAccess.pendingGroupInviteTokenHash,
      1,
    );

    await env.EMAIL_QUEUE.send({
      type: "magic_link",
      to: email,
      from: env.EMBERCHAMBER_EMAIL_FROM,
      completionUrl: `${publicWebUrl(env)}/auth/complete?token=${encodeURIComponent(completionToken)}`,
      expiresAt,
    });
    await scheduleCleanup(env, "auth_start");

    const response: MagicLinkChallenge = {
      id: challengeId,
      expiresAt,
      inviteRequired: !accountExists,
      ...(env.EMBERCHAMBER_EMAIL_PROVIDER === "log"
        ? { debugCompletionToken: completionToken }
        : {}),
    };

    return json(response, { status: 202 });
  }

  if (request.method === "POST" && pathname === "/v1/auth/complete") {
    const body = authCompleteSchema.parse(await readJson(request));
    const clientMetadata = parseClientMetadata(request);
    const completionTokenHash = await sha256Hex(
      `completion:${body.completionToken}`,
    );
    const challenge = await dbFirst<{
      id: string;
      email_ciphertext: string;
      email_blind_index: string;
      invite_token_hash: string | null;
      pending_group_conversation_id: string | null;
      pending_group_invite_token_hash: string | null;
      expires_at: string;
      consumed_at: string | null;
      requested_device_label: string | null;
      age_confirmed_18: number;
    }>(
      env.DB,
      `SELECT id, email_ciphertext, email_blind_index, invite_token_hash, pending_group_conversation_id, pending_group_invite_token_hash, expires_at, consumed_at, requested_device_label, age_confirmed_18
         FROM auth_challenges
        WHERE completion_token_hash = ?1`,
      completionTokenHash,
    );

    if (
      !challenge ||
      challenge.consumed_at ||
      challenge.expires_at <= new Date().toISOString()
    ) {
      throw new HttpError(
        410,
        "Magic link expired or already used",
        "MAGIC_LINK_INVALID",
      );
    }

    if (!challenge.age_confirmed_18) {
      throw new HttpError(
        403,
        "Adults-only affirmation is required",
        "AGE_CONFIRMATION_REQUIRED",
      );
    }

    let account = await dbFirst<{ account_id: string }>(
      env.DB,
      "SELECT account_id FROM account_emails WHERE email_blind_index = ?1",
      challenge.email_blind_index,
    );

    const now = new Date().toISOString();
    if (!account) {
      const accountId = crypto.randomUUID();
      await dbRun(
        env.DB,
        "INSERT INTO accounts (id, display_name, age_confirmed_18_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
        accountId,
        conversationTitleForAccount(accountId),
        now,
        now,
      );
      await dbRun(
        env.DB,
        "INSERT INTO account_emails (account_id, email_ciphertext, email_blind_index, created_at) VALUES (?1, ?2, ?3, ?4)",
        accountId,
        challenge.email_ciphertext,
        challenge.email_blind_index,
        now,
      );

      if (challenge.invite_token_hash) {
        await dbRun(
          env.DB,
          "UPDATE beta_invites SET use_count = use_count + 1 WHERE token_hash = ?1",
          challenge.invite_token_hash,
        );
      }

      account = { account_id: accountId };
    }

    await dbRun(
      env.DB,
      `UPDATE accounts
          SET age_confirmed_18_at = COALESCE(age_confirmed_18_at, ?1),
              updated_at = ?1
        WHERE id = ?2`,
      now,
      account.account_id,
    );

    const bootstrapConversation =
      challenge.pending_group_conversation_id &&
      challenge.pending_group_invite_token_hash
        ? await acceptConversationInviteByTokenHash(
            env,
            account.account_id,
            challenge.pending_group_conversation_id,
            challenge.pending_group_invite_token_hash,
          )
        : null;

    const deviceId = crypto.randomUUID();
    const deviceLabel =
      body.deviceLabel ??
      challenge.requested_device_label ??
      "Primary device";
    await dbRun(
      env.DB,
      "INSERT INTO devices (id, account_id, device_label, created_at) VALUES (?1, ?2, ?3, ?4)",
      deviceId,
      account.account_id,
      deviceLabel,
      now,
    );
    await dbRun(
      env.DB,
      "UPDATE auth_challenges SET consumed_at = ?1 WHERE id = ?2",
      now,
      challenge.id,
    );

    return json(
      await createSession(
        env,
        account.account_id,
        deviceId,
        bootstrapConversation,
        clientMetadata,
      ),
    );
  }

  if (request.method === "POST" && pathname === "/v1/auth/refresh") {
    const body = z
      .object({ refreshToken: z.string().min(16) })
      .parse(await readJson(request));
    const refreshTokenHash = await sha256Hex(
      `refresh:${body.refreshToken}`,
    );
    const session = await dbFirst<{
      id: string;
      account_id: string;
      device_id: string;
      expires_at: string;
      last_seen_at: string;
      revoked_at: string | null;
    }>(
      env.DB,
      `SELECT id, account_id, device_id, expires_at, last_seen_at, revoked_at
         FROM sessions
        WHERE refresh_token_hash = ?1`,
      refreshTokenHash,
    );

    if (
      !session ||
      session.revoked_at ||
      (session.expires_at <= new Date().toISOString() &&
        !isSessionWithinRefreshRecoveryWindow(session.last_seen_at))
    ) {
      throw new HttpError(
        401,
        "Invalid refresh token",
        "INVALID_REFRESH_TOKEN",
      );
    }

    const accessToken = await signAccessToken(
      {
        sub: session.account_id,
        deviceId: session.device_id,
        sessionId: session.id,
      },
      env.EMBERCHAMBER_ACCESS_TOKEN_SECRET,
    );
    const expiresAt = nextSessionExpiresAt();
    await touchSession(
      env,
      session.id,
      parseClientMetadata(request),
      expiresAt,
    );

    return json({
      accessToken,
      sessionId: session.id,
      deviceId: session.device_id,
      expiresAt,
    });
  }

  if (request.method === "POST" && pathname === "/v1/invite/check") {
    const ip = request.headers.get("cf-connecting-ip") ?? "local";
    await enforceRateLimit(env, `invite:check:${ip}`, 20, 60 * 60 * 1000);

    const body = inviteCheckSchema.parse(await readJson(request));
    const tokenHash = await hashInviteToken(body.code);

    const invite = await dbFirst<{
      revoked_at: string | null;
      expires_at: string | null;
      max_uses: number | null;
      use_count: number;
    }>(
      env.DB,
      `SELECT revoked_at, expires_at, max_uses, use_count
         FROM beta_invites
        WHERE token_hash = ?1`,
      tokenHash,
    );

    if (!invite) {
      return json({ status: "not_found" });
    }
    if (invite.revoked_at) {
      return json({ status: "revoked" });
    }
    if (invite.expires_at && invite.expires_at <= new Date().toISOString()) {
      return json({ status: "expired", expiresAt: invite.expires_at });
    }
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return json({ status: "exhausted" });
    }

    const usesRemaining =
      invite.max_uses !== null ? invite.max_uses - invite.use_count : null;
    return json({
      status: "valid",
      expiresAt: invite.expires_at ?? undefined,
      usesRemaining,
    });
  }

  if (request.method === "POST" && pathname === "/v1/auth/resend-magic-link") {
    const ip = request.headers.get("cf-connecting-ip") ?? "local";
    const body = resendMagicLinkSchema.parse(await readJson(request));
    const email = normalizeEmail(body.email);
    const emailBlindIndex = await blindIndex(env.EMBERCHAMBER_EMAIL_INDEX_SECRET, email);

    // Rate-limit by IP and by email blind index to prevent abuse.
    await enforceRateLimit(env, `resend:ip:${ip}`, 5, 15 * 60 * 1000);
    await enforceRateLimit(env, `resend:email:${emailBlindIndex}`, 3, 15 * 60 * 1000);

    const accountExists = await isExistingAccount(env, emailBlindIndex);
    if (accountExists) {
      const challengeId = crypto.randomUUID();
      const completionToken = `${challengeId}.${crypto.randomUUID()}`;
      const completionTokenHash = await sha256Hex(`completion:${completionToken}`);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const emailCiphertext = await encryptString(env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET, email);

      await dbRun(
        env.DB,
        `INSERT INTO auth_challenges (
          id, email_ciphertext, email_blind_index, invite_token_hash, completion_token_hash, expires_at, created_at, requested_device_label, pending_group_conversation_id, pending_group_invite_token_hash, age_confirmed_18
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
        challengeId,
        emailCiphertext,
        emailBlindIndex,
        null,
        completionTokenHash,
        expiresAt,
        new Date().toISOString(),
        "Resent device",
        null,
        null,
        1,
      );

      await env.EMAIL_QUEUE.send({
        type: "magic_link",
        to: email,
        from: env.EMBERCHAMBER_EMAIL_FROM,
        completionUrl: `${publicWebUrl(env)}/auth/complete?token=${encodeURIComponent(completionToken)}`,
        expiresAt,
      });
      await scheduleCleanup(env, "auth_start");
    }

    // Always return the same response to prevent account enumeration.
    return json({ sent: true });
  }

  if (
    request.method === "POST" &&
    [
      "/v1/passkeys/register/options",
      "/v1/passkeys/register/verify",
      "/v1/passkeys/auth/options",
      "/v1/passkeys/auth/verify",
    ].includes(pathname)
  ) {
    return json(
      {
        supported: false,
        message:
          "Passkey enrollment is scaffolded in the protocol, but not yet wired in this beta relay.",
      },
      { status: 501 },
    );
  }

  return null;
}
