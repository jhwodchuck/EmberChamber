import type { Env, CleanupMessage } from "../types";
import { dbAll, dbRun } from "../lib/d1";

export async function scheduleCleanup(env: Env, source: string) {
  await env.CLEANUP_QUEUE.send({
    type: "cleanup_pulse",
    source,
    requestedAt: new Date().toISOString(),
  } satisfies CleanupMessage);
}

export async function runRelayCleanup(env: Env) {
  const nowIso = new Date().toISOString();
  const staleConsumedCutoff = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();

  await dbRun(
    env.DB,
    `DELETE FROM auth_challenges
      WHERE expires_at <= ?1
         OR (consumed_at IS NOT NULL AND consumed_at <= ?2)`,
    nowIso,
    staleConsumedCutoff,
  );

  await dbRun(
    env.DB,
    `DELETE FROM device_links
      WHERE expires_at <= ?1
         OR (approved_at IS NOT NULL AND approved_at <= ?2)`,
    nowIso,
    staleConsumedCutoff,
  );

  await dbRun(
    env.DB,
    "DELETE FROM mailbox_dedup WHERE expires_at <= ?1",
    nowIso,
  );

  const expiredAttachments = await dbAll<{
    id: string;
    r2_key: string;
  }>(
    env.DB,
    `SELECT id, r2_key
       FROM attachments
      WHERE deleted_at IS NULL
        AND expires_at <= ?1`,
    nowIso,
  );

  for (const attachment of expiredAttachments) {
    await env.ATTACHMENTS.delete(attachment.r2_key);
    await dbRun(
      env.DB,
      "UPDATE attachments SET deleted_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
      nowIso,
      attachment.id,
    );
  }
}
