import { dbRun } from "../lib/d1";
import type { Env } from "../types";

export type AuditActorKind = "operator" | "admin_secret";

export interface AuditEventInput {
  // The operator account performing the action. Null for shared-secret/CLI
  // (admin_secret) actions where there is no authenticated account.
  actorAccountId?: string | null;
  actorKind?: AuditActorKind;
  action: string;
  targetAccountId?: string | null;
  targetConversationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

// Writes a permanent audit row. Best-effort: failures are logged but never block
// the action that triggered them, so an audit-table problem cannot wedge a
// revocation or recovery operation.
export async function recordAuditEvent(
  env: Env,
  event: AuditEventInput,
): Promise<void> {
  try {
    await dbRun(
      env.DB,
      `INSERT INTO operator_audit_log (
         id,
         actor_account_id,
         actor_kind,
         action,
         target_account_id,
         target_conversation_id,
         metadata_json,
         created_at
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      crypto.randomUUID(),
      event.actorAccountId ?? null,
      event.actorKind ?? "operator",
      event.action,
      event.targetAccountId ?? null,
      event.targetConversationId ?? null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      new Date().toISOString(),
    );
  } catch (error) {
    console.error("audit_log_write_failed", {
      action: event.action,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
