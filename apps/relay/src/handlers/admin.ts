import { requireAdmin } from "../middleware/auth";
import { adminGrantOperatorSchema, adminRevokeSessionsSchema } from "../schemas";
import { blindIndex, encryptString, sha256Hex } from "../lib/crypto";
import { dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { recordAuditEvent } from "../services/audit";
import { publicWebUrl } from "../services/utils";
import type { Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (
    request.method === "POST" &&
    pathname === "/v1/admin/review-session"
  ) {
    await requireAdmin(request, env);

    const reviewEmail = "play-store-reviewer@emberchamber.internal";
    const emailBlindIndex = await blindIndex(
      env.EMBERCHAMBER_EMAIL_INDEX_SECRET,
      reviewEmail,
    );
    const emailCiphertext = await encryptString(
      env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET,
      reviewEmail,
    );

    const challengeId = crypto.randomUUID();
    const completionToken = `${challengeId}.${crypto.randomUUID()}`;
    const completionTokenHash = await sha256Hex(
      `completion:${completionToken}`,
    );
    const expiresAt = new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    ).toISOString();

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
      "Play Store Reviewer",
      null,
      null,
      1,
    );

    const completionUrl = `${publicWebUrl(env)}/auth/complete?token=${encodeURIComponent(completionToken)}`;

    console.log(
      `review_session_created challenge=${challengeId} expires=${expiresAt}`,
    );

    return json({
      challengeId,
      completionUrl,
      expiresAt,
      note: "Provide this URL to the Google Play reviewer. It is single-use and expires in 90 days.",
    });
  }

  // Break-glass operator bootstrap. The first operator must be seeded somehow;
  // this shared-secret endpoint is the scriptable form of the manual D1 step.
  if (request.method === "POST" && pathname === "/v1/admin/grant-operator") {
    await requireAdmin(request, env);
    const body = adminGrantOperatorSchema.parse(await readJson(request));
    const account = await dbFirst<{ id: string }>(
      env.DB,
      `SELECT id FROM accounts WHERE id = ?1`,
      body.accountId,
    );
    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    await dbRun(
      env.DB,
      `UPDATE accounts SET is_operator = ?1, updated_at = ?2 WHERE id = ?3`,
      body.isOperator ? 1 : 0,
      new Date().toISOString(),
      body.accountId,
    );

    await recordAuditEvent(env, {
      actorKind: "admin_secret",
      action: body.isOperator ? "grant_operator" : "revoke_operator",
      targetAccountId: body.accountId,
    });

    return json({ accountId: body.accountId, isOperator: body.isOperator });
  }

  if (
    request.method === "POST" &&
    pathname === "/v1/admin/revoke-account-sessions"
  ) {
    await requireAdmin(request, env);
    const body = adminRevokeSessionsSchema.parse(await readJson(request));
    const revokedAt = new Date().toISOString();
    const activeSessionCount = await dbFirst<{ count: number }>(
      env.DB,
      `SELECT COUNT(*) AS count
         FROM sessions
        WHERE account_id = ?1
          AND revoked_at IS NULL`,
      body.accountId,
    );
    const activePushTokenCount = body.revokePushTokens
      ? await dbFirst<{ count: number }>(
          env.DB,
          `SELECT COUNT(*) AS count
             FROM device_push_tokens
            WHERE account_id = ?1
              AND invalidated_at IS NULL`,
          body.accountId,
        )
      : null;

    await dbRun(
      env.DB,
      `UPDATE sessions
          SET revoked_at = ?1
        WHERE account_id = ?2
          AND revoked_at IS NULL`,
      revokedAt,
      body.accountId,
    );

    if (body.revokePushTokens) {
      await dbRun(
        env.DB,
        `UPDATE device_push_tokens
            SET invalidated_at = ?1,
                last_push_error = ?2
          WHERE account_id = ?3
            AND invalidated_at IS NULL`,
        revokedAt,
        "operator_revoked_sessions",
        body.accountId,
      );
    }

    await recordAuditEvent(env, {
      actorKind: "admin_secret",
      action: "revoke_account_sessions",
      targetAccountId: body.accountId,
      metadata: {
        sessionsRevoked: activeSessionCount?.count ?? 0,
        pushTokensInvalidated: activePushTokenCount?.count ?? 0,
        reason: body.reason ?? null,
      },
    });

    return json({
      revoked: true,
      accountId: body.accountId,
      revokedAt,
      sessionsRevoked: activeSessionCount?.count ?? 0,
      pushTokensInvalidated: activePushTokenCount?.count ?? 0,
    });
  }

  return null;
}
