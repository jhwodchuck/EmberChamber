import { requireAuth, requireOperator } from "../middleware/auth";
import {
  batchReportUpdateSchema,
  recoveryHandoffSchema,
  reportStatusUpdateSchema,
  suspendAccountSchema,
} from "../schemas";
import { blindIndex, normalizeEmail, sha256Hex } from "../lib/crypto";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { recordAuditEvent } from "../services/audit";
import { accountUsername, publicWebUrl } from "../services/utils";
import type { Env } from "../types";

const PAGE_SIZE = 50;

// Operator-session-gated surface backing the admin web UI. Distinct from
// handlers/admin.ts, which guards shared-secret/CLI break-glass endpoints.
export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  // GET /v1/me/operator-status — authed (not operator-gated) so every client can
  // decide whether to surface the admin nav. Kept here to co-locate operator code.
  if (request.method === "GET" && pathname === "/v1/me/operator-status") {
    const auth = await requireAuth(request, env);
    const account = await dbFirst<{ is_operator: number }>(
      env.DB,
      `SELECT is_operator FROM accounts WHERE id = ?1`,
      auth.accountId,
    );
    return json({ isOperator: account?.is_operator === 1 });
  }

  if (request.method === "GET" && pathname === "/v1/admin/reports") {
    await requireOperator(request, env);
    const status = url.searchParams.get("status");
    const cursor = url.searchParams.get("cursor");
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (status) {
      params.push(status);
      clauses.push(`status = ?${params.length}`);
    }
    if (cursor) {
      params.push(cursor);
      clauses.push(`created_at < ?${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    params.push(PAGE_SIZE + 1);
    const rows = await dbAll<{
      id: string;
      reporter_account_id: string;
      target_conversation_id: string | null;
      target_account_id: string | null;
      target_attachment_id: string | null;
      reason: string;
      status: string;
      created_at: string;
      reviewed_at: string | null;
    }>(
      env.DB,
      `SELECT id, reporter_account_id, target_conversation_id, target_account_id,
              target_attachment_id, reason, status, created_at, reviewed_at
         FROM reports
         ${where}
        ORDER BY created_at DESC
        LIMIT ?${params.length}`,
      ...params,
    );

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    return json({
      reports: page.map((row) => ({
        id: row.id,
        reporterAccountId: row.reporter_account_id,
        reporterUsername: accountUsername(row.reporter_account_id),
        targetConversationId: row.target_conversation_id,
        targetAccountId: row.target_account_id,
        targetAttachmentId: row.target_attachment_id,
        reason: row.reason,
        status: row.status,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.created_at : null,
    });
  }

  const reportDetailMatch = pathname.match(
    /^\/v1\/admin\/reports\/([0-9a-f-]{36})$/i,
  );

  if (request.method === "GET" && reportDetailMatch) {
    await requireOperator(request, env);
    const reportId = reportDetailMatch[1];
    const row = await dbFirst<{
      id: string;
      reporter_account_id: string;
      target_conversation_id: string | null;
      target_account_id: string | null;
      target_attachment_id: string | null;
      reason: string;
      disclosed_payload_json: string;
      evidence_message_ids_json: string | null;
      status: string;
      created_at: string;
      reviewed_by_account_id: string | null;
      reviewed_at: string | null;
      resolution_note: string | null;
    }>(
      env.DB,
      `SELECT id, reporter_account_id, target_conversation_id, target_account_id,
              target_attachment_id, reason, disclosed_payload_json,
              evidence_message_ids_json, status, created_at,
              reviewed_by_account_id, reviewed_at, resolution_note
         FROM reports
        WHERE id = ?1`,
      reportId,
    );

    if (!row) {
      throw new HttpError(404, "Report not found", "REPORT_NOT_FOUND");
    }

    return json({
      id: row.id,
      reporterAccountId: row.reporter_account_id,
      reporterUsername: accountUsername(row.reporter_account_id),
      targetConversationId: row.target_conversation_id,
      targetAccountId: row.target_account_id,
      targetAttachmentId: row.target_attachment_id,
      reason: row.reason,
      disclosedPayload: safeParse(row.disclosed_payload_json),
      evidenceMessageIds: safeParse(row.evidence_message_ids_json) ?? [],
      status: row.status,
      createdAt: row.created_at,
      reviewedByAccountId: row.reviewed_by_account_id,
      reviewedAt: row.reviewed_at,
      resolutionNote: row.resolution_note,
    });
  }

  if (request.method === "PATCH" && reportDetailMatch) {
    const operator = await requireOperator(request, env);
    const reportId = reportDetailMatch[1];
    const body = reportStatusUpdateSchema.parse(await readJson(request));

    const existing = await dbFirst<{ id: string; status: string }>(
      env.DB,
      `SELECT id, status FROM reports WHERE id = ?1`,
      reportId,
    );
    if (!existing) {
      throw new HttpError(404, "Report not found", "REPORT_NOT_FOUND");
    }

    const reviewedAt = new Date().toISOString();
    await dbRun(
      env.DB,
      `UPDATE reports
          SET status = ?1,
              resolution_note = COALESCE(?2, resolution_note),
              reviewed_by_account_id = ?3,
              reviewed_at = ?4
        WHERE id = ?5`,
      body.status,
      body.resolutionNote ?? null,
      operator.accountId,
      reviewedAt,
      reportId,
    );

    await recordAuditEvent(env, {
      actorAccountId: operator.accountId,
      action: "report_status_update",
      metadata: {
        reportId,
        fromStatus: existing.status,
        toStatus: body.status,
        hasNote: Boolean(body.resolutionNote),
      },
    });

    return json({ id: reportId, status: body.status, reviewedAt });
  }

  if (request.method === "PATCH" && pathname === "/v1/admin/reports/batch") {
    const operator = await requireOperator(request, env);
    const body = batchReportUpdateSchema.parse(await readJson(request));

    const reviewedAt = new Date().toISOString();
    const placeholders = body.ids.map((_, i) => `?${i + 1}`).join(", ");
    const baseParamCount = body.ids.length;
    await dbRun(
      env.DB,
      `UPDATE reports
          SET status = ?${baseParamCount + 1},
              resolution_note = COALESCE(?${baseParamCount + 2}, resolution_note),
              reviewed_by_account_id = ?${baseParamCount + 3},
              reviewed_at = ?${baseParamCount + 4}
        WHERE id IN (${placeholders})`,
      ...body.ids,
      body.status,
      body.resolutionNote ?? null,
      operator.accountId,
      reviewedAt,
    );

    await recordAuditEvent(env, {
      actorAccountId: operator.accountId,
      action: "batch_report_update",
      metadata: {
        count: body.ids.length,
        ids: body.ids,
        status: body.status,
        hasNote: Boolean(body.resolutionNote),
      },
    });

    return json({ updated: body.ids.length, status: body.status, reviewedAt });
  }

  if (request.method === "GET" && pathname === "/v1/admin/accounts/lookup") {
    await requireOperator(request, env);
    const q = url.searchParams.get("q")?.trim();
    if (!q) {
      throw new HttpError(400, "Missing query", "MISSING_QUERY");
    }

    let accountId: string | null = null;
    if (q.includes("@")) {
      const index = await blindIndex(
        env.EMBERCHAMBER_EMAIL_INDEX_SECRET,
        normalizeEmail(q),
      );
      const match = await dbFirst<{ account_id: string }>(
        env.DB,
        `SELECT account_id FROM account_emails WHERE email_blind_index = ?1`,
        index,
      );
      accountId = match?.account_id ?? null;
    } else {
      // Treat as an account id (also matches the deterministic username form).
      const match = await dbFirst<{ id: string }>(
        env.DB,
        `SELECT id FROM accounts WHERE id = ?1`,
        q,
      );
      accountId = match?.id ?? null;
    }

    if (!accountId) {
      return json({ account: null });
    }

    const account = await dbFirst<{
      id: string;
      display_name: string;
      is_operator: number;
      suspended_at: string | null;
      suspension_reason: string | null;
      created_at: string;
    }>(
      env.DB,
      `SELECT id, display_name, is_operator, suspended_at, suspension_reason, created_at FROM accounts WHERE id = ?1`,
      accountId,
    );
    if (!account) {
      return json({ account: null });
    }

    const sessionCount = await dbFirst<{ count: number }>(
      env.DB,
      `SELECT COUNT(*) AS count FROM sessions WHERE account_id = ?1 AND revoked_at IS NULL`,
      accountId,
    );

    return json({
      account: {
        id: account.id,
        username: accountUsername(account.id),
        displayName: account.display_name,
        isOperator: account.is_operator === 1,
        isSuspended: account.suspended_at !== null,
        suspendedAt: account.suspended_at,
        suspensionReason: account.suspension_reason,
        createdAt: account.created_at,
        activeSessionCount: sessionCount?.count ?? 0,
      },
    });
  }

  if (request.method === "GET" && pathname === "/v1/admin/audit-log") {
    await requireOperator(request, env);
    const cursor = url.searchParams.get("cursor");
    const params: unknown[] = [];
    let where = "";
    if (cursor) {
      params.push(cursor);
      where = `WHERE created_at < ?${params.length}`;
    }
    params.push(PAGE_SIZE + 1);
    const rows = await dbAll<{
      id: string;
      actor_account_id: string | null;
      actor_kind: string;
      action: string;
      target_account_id: string | null;
      target_conversation_id: string | null;
      metadata_json: string | null;
      created_at: string;
    }>(
      env.DB,
      `SELECT id, actor_account_id, actor_kind, action, target_account_id,
              target_conversation_id, metadata_json, created_at
         FROM operator_audit_log
         ${where}
        ORDER BY created_at DESC
        LIMIT ?${params.length}`,
      ...params,
    );

    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    return json({
      events: page.map((row) => ({
        id: row.id,
        actorAccountId: row.actor_account_id,
        actorKind: row.actor_kind,
        action: row.action,
        targetAccountId: row.target_account_id,
        targetConversationId: row.target_conversation_id,
        metadata: safeParse(row.metadata_json),
        createdAt: row.created_at,
      })),
      nextCursor: hasMore ? page[page.length - 1]?.created_at : null,
    });
  }

  const accountSuspendMatch = pathname.match(
    /^\/v1\/admin\/accounts\/([0-9a-f-]{36})\/suspend$/i,
  );

  if (request.method === "POST" && accountSuspendMatch) {
    const operator = await requireOperator(request, env);
    const targetAccountId = accountSuspendMatch[1];
    const body = suspendAccountSchema.parse(await readJson(request));

    const account = await dbFirst<{ id: string }>(
      env.DB,
      `SELECT id FROM accounts WHERE id = ?1`,
      targetAccountId,
    );
    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    const now = new Date().toISOString();
    await dbRun(
      env.DB,
      `UPDATE accounts SET suspended_at = ?1, suspension_reason = ?2 WHERE id = ?3`,
      now,
      body.reason ?? null,
      targetAccountId,
    );
    await dbRun(
      env.DB,
      `UPDATE sessions SET revoked_at = ?1 WHERE account_id = ?2 AND revoked_at IS NULL`,
      now,
      targetAccountId,
    );
    await dbRun(
      env.DB,
      `UPDATE device_push_tokens
          SET invalidated_at = ?1, last_push_error = ?2
        WHERE account_id = ?3 AND invalidated_at IS NULL`,
      now,
      "operator_suspension",
      targetAccountId,
    );

    await recordAuditEvent(env, {
      actorAccountId: operator.accountId,
      action: "account_suspended",
      targetAccountId,
      metadata: { reason: body.reason ?? null },
    });

    return json({ suspended: true, accountId: targetAccountId, suspendedAt: now });
  }

  const accountUnsuspendMatch = pathname.match(
    /^\/v1\/admin\/accounts\/([0-9a-f-]{36})\/unsuspend$/i,
  );

  if (request.method === "POST" && accountUnsuspendMatch) {
    const operator = await requireOperator(request, env);
    const targetAccountId = accountUnsuspendMatch[1];

    const account = await dbFirst<{ id: string; suspended_at: string | null }>(
      env.DB,
      `SELECT id, suspended_at FROM accounts WHERE id = ?1`,
      targetAccountId,
    );
    if (!account) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }
    if (account.suspended_at === null) {
      throw new HttpError(409, "Account is not suspended", "NOT_SUSPENDED");
    }

    await dbRun(
      env.DB,
      `UPDATE accounts SET suspended_at = NULL, suspension_reason = NULL WHERE id = ?1`,
      targetAccountId,
    );

    await recordAuditEvent(env, {
      actorAccountId: operator.accountId,
      action: "account_unsuspended",
      targetAccountId,
      metadata: {},
    });

    return json({ suspended: false, accountId: targetAccountId });
  }

  const recoveryHandoffMatch = pathname.match(
    /^\/v1\/admin\/accounts\/([0-9a-f-]{36})\/recovery-handoff$/i,
  );

  if (request.method === "POST" && recoveryHandoffMatch) {
    const operator = await requireOperator(request, env);
    const targetAccountId = recoveryHandoffMatch[1];
    const body = recoveryHandoffSchema.parse(await readJson(request));

    const emailRow = await dbFirst<{
      email_ciphertext: string;
      email_blind_index: string;
    }>(
      env.DB,
      `SELECT email_ciphertext, email_blind_index FROM account_emails WHERE account_id = ?1`,
      targetAccountId,
    );
    if (!emailRow) {
      throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
    }

    const revokedAt = new Date().toISOString();
    const activeSessionCount = await dbFirst<{ count: number }>(
      env.DB,
      `SELECT COUNT(*) AS count FROM sessions WHERE account_id = ?1 AND revoked_at IS NULL`,
      targetAccountId,
    );

    // Force-signout-all: existing devices lose access immediately.
    await dbRun(
      env.DB,
      `UPDATE sessions SET revoked_at = ?1 WHERE account_id = ?2 AND revoked_at IS NULL`,
      revokedAt,
      targetAccountId,
    );
    await dbRun(
      env.DB,
      `UPDATE device_push_tokens
          SET invalidated_at = ?1, last_push_error = ?2
        WHERE account_id = ?3 AND invalidated_at IS NULL`,
      revokedAt,
      "operator_recovery_handoff",
      targetAccountId,
    );

    // Mint a single-use magic-link challenge bound to the existing account's email,
    // so completing it re-bootstraps a fresh device on the SAME account identity.
    const challengeId = crypto.randomUUID();
    const completionToken = `${challengeId}.${crypto.randomUUID()}`;
    const completionTokenHash = await sha256Hex(`completion:${completionToken}`);
    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();

    await dbRun(
      env.DB,
      `INSERT INTO auth_challenges (
         id, email_ciphertext, email_blind_index, invite_token_hash,
         completion_token_hash, expires_at, created_at, requested_device_label,
         pending_group_conversation_id, pending_group_invite_token_hash, age_confirmed_18
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
      challengeId,
      emailRow.email_ciphertext,
      emailRow.email_blind_index,
      null,
      completionTokenHash,
      expiresAt,
      revokedAt,
      body.deviceLabel ?? "Recovered device",
      null,
      null,
      1,
    );

    const completionUrl = `${publicWebUrl(env)}/auth/complete?token=${encodeURIComponent(completionToken)}`;

    await recordAuditEvent(env, {
      actorAccountId: operator.accountId,
      action: "account_recovery_handoff",
      targetAccountId,
      metadata: {
        sessionsRevoked: activeSessionCount?.count ?? 0,
        reason: body.reason ?? null,
        challengeId,
      },
    });

    return json({
      accountId: targetAccountId,
      sessionsRevoked: activeSessionCount?.count ?? 0,
      completionUrl,
      expiresAt,
      note: "Deliver this single-use link to the account holder out-of-band. It re-bootstraps a new device on the same account and expires in 24 hours.",
    });
  }

  return null;
}

function safeParse(value: string | null): unknown {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
