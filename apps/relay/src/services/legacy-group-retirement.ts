import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError } from "../lib/http";
import type { Env } from "../types";

// Legacy relay-hosted groups (kind = 'group', history_mode = 'relay_hosted')
// predate the device-encrypted-group migration. New groups are always
// created device_encrypted (POST /v1/groups), so any remaining relay-hosted
// group row is a pre-migration leftover, not an ongoing product mode.
//
// This module intentionally only ever touches kind = 'group' rows.
// Communities and rooms (kind = 'community' | 'room') are relay-hosted by
// permanent product design, not a legacy leftover, and must never be
// retired or purged through this path.

interface LegacyGroupRow {
  id: string;
  kind: string;
  history_mode: string | null;
  legacy_history_retired_at: string | null;
  legacy_history_purged_at: string | null;
}

async function loadLegacyGroup(
  env: Env,
  conversationId: string,
): Promise<LegacyGroupRow> {
  const row = await dbFirst<LegacyGroupRow>(
    env.DB,
    `SELECT id, kind, history_mode, legacy_history_retired_at, legacy_history_purged_at
       FROM conversations
      WHERE id = ?1`,
    conversationId,
  );

  if (!row) {
    throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
  }

  if (row.kind !== "group" || row.history_mode !== "relay_hosted") {
    throw new HttpError(
      409,
      "Only legacy relay-hosted groups can be retired or purged. Communities, rooms, and device-encrypted groups are not eligible.",
      "NOT_A_LEGACY_GROUP",
    );
  }

  return row;
}

export async function retireLegacyGroupHistory(
  env: Env,
  conversationId: string,
): Promise<{ alreadyRetired: boolean; retiredAt: string }> {
  const row = await loadLegacyGroup(env, conversationId);

  if (row.legacy_history_retired_at) {
    return { alreadyRetired: true, retiredAt: row.legacy_history_retired_at };
  }

  const now = new Date().toISOString();
  await dbRun(
    env.DB,
    `UPDATE conversations SET legacy_history_retired_at = ?1 WHERE id = ?2`,
    now,
    conversationId,
  );

  return { alreadyRetired: false, retiredAt: now };
}

export async function purgeLegacyGroupHistory(
  env: Env,
  conversationId: string,
): Promise<{
  alreadyPurged: boolean;
  purgedAt: string;
  deletedMessageCount: number;
  deletedAttachmentCount: number;
}> {
  const row = await loadLegacyGroup(env, conversationId);

  if (!row.legacy_history_retired_at) {
    throw new HttpError(
      409,
      "Freeze this group's legacy history before purging it.",
      "GROUP_NOT_RETIRED",
    );
  }

  if (row.legacy_history_purged_at) {
    return {
      alreadyPurged: true,
      purgedAt: row.legacy_history_purged_at,
      deletedMessageCount: 0,
      deletedAttachmentCount: 0,
    };
  }

  const attachments = await dbAll<{ id: string; r2_key: string }>(
    env.DB,
    `SELECT id, r2_key
       FROM attachments
      WHERE conversation_id = ?1
        AND deleted_at IS NULL`,
    conversationId,
  );

  for (const attachment of attachments) {
    await env.ATTACHMENTS.delete(attachment.r2_key);
  }

  if (attachments.length > 0) {
    await dbRun(
      env.DB,
      `UPDATE attachments SET deleted_at = ?1 WHERE conversation_id = ?2 AND deleted_at IS NULL`,
      new Date().toISOString(),
      conversationId,
    );
  }

  const messageCountRow = await dbFirst<{ cnt: number }>(
    env.DB,
    `SELECT COUNT(*) AS cnt FROM conversation_messages WHERE conversation_id = ?1`,
    conversationId,
  );

  await dbRun(
    env.DB,
    `DELETE FROM conversation_messages WHERE conversation_id = ?1`,
    conversationId,
  );

  const now = new Date().toISOString();
  await dbRun(
    env.DB,
    `UPDATE conversations SET legacy_history_purged_at = ?1 WHERE id = ?2`,
    now,
    conversationId,
  );

  return {
    alreadyPurged: false,
    purgedAt: now,
    deletedMessageCount: messageCountRow?.cnt ?? 0,
    deletedAttachmentCount: attachments.length,
  };
}
