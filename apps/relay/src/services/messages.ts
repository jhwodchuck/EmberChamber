import type { GroupThreadMessage, CipherEnvelope } from "@emberchamber/protocol";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError } from "../lib/http";
import type { Env, RelayHostedAttachmentRow } from "../types";
import {
  updateConversationActivity,
  normalizeConversationRole,
} from "./conversations";
import { queuePushWake } from "./push";
import { buildRelayHostedAttachment } from "./attachments";
import { conversationTitleForAccount } from "./utils";

export async function appendConversationMessage(
  env: Env,
  input: {
    conversationId: string;
    senderAccountId: string;
    kind: "text" | "media" | "system_notice";
    text?: string | null;
    attachmentId?: string | null;
    clientMessageId?: string | null;
    createdAt?: string;
    replyToMessageId?: string | null;
    replyToText?: string | null;
    replyToSenderDisplayName?: string | null;
  },
) {
  const messageId = crypto.randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();

  await dbRun(
    env.DB,
    `INSERT INTO conversation_messages (
       id,
       conversation_id,
       sender_account_id,
       kind,
       body_text,
       attachment_id,
       client_message_id,
       created_at,
       reply_to_message_id,
       reply_to_text,
       reply_to_sender_display_name
     )
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    messageId,
    input.conversationId,
    input.senderAccountId,
    input.kind,
    input.text ?? null,
    input.attachmentId ?? null,
    input.clientMessageId ?? null,
    createdAt,
    input.replyToMessageId ?? null,
    input.replyToText ?? null,
    input.replyToSenderDisplayName ?? null,
  );

  await updateConversationActivity(env, input.conversationId, {
    at: createdAt,
    kind: input.kind,
  });

  return {
    id: messageId,
    createdAt,
  };
}

export function parseMessageReactions(
  raw: string | null | undefined,
): Record<string, string[]> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, string[]> = {};
    for (const [emoji, value] of Object.entries(parsed)) {
      if (!Array.isArray(value) || !emoji.trim()) {
        continue;
      }

      const accountIds = Array.from(
        new Set(value.filter((entry): entry is string => typeof entry === "string")),
      );
      if (accountIds.length > 0) {
        normalized[emoji] = accountIds;
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

export async function toggleRelayHostedMessageReaction(
  env: Env,
  input: {
    conversationId: string;
    messageId: string;
    accountId: string;
    emoji: string;
  },
): Promise<Record<string, string[]>> {
  const row = await dbFirst<{
    id: string;
    reactions_json: string | null;
  }>(
    env.DB,
    `SELECT id, reactions_json
       FROM conversation_messages
      WHERE id = ?1
        AND conversation_id = ?2
        AND deleted_at IS NULL`,
    input.messageId,
    input.conversationId,
  );

  if (!row) {
    throw new HttpError(404, "Message not found", "MESSAGE_NOT_FOUND");
  }

  const reactions = parseMessageReactions(row.reactions_json);
  const current = new Set(reactions[input.emoji] ?? []);
  if (current.has(input.accountId)) {
    current.delete(input.accountId);
  } else {
    current.add(input.accountId);
  }

  if (current.size > 0) {
    reactions[input.emoji] = Array.from(current).sort();
  } else {
    delete reactions[input.emoji];
  }

  const nextSerialized =
    Object.keys(reactions).length > 0 ? JSON.stringify(reactions) : null;
  await dbRun(
    env.DB,
    "UPDATE conversation_messages SET reactions_json = ?1 WHERE id = ?2",
    nextSerialized,
    input.messageId,
  );

  return reactions;
}

export async function loadRelayHostedConversationMessages(
  env: Env,
  conversationId: string,
  limit: number,
  requestingAccountId?: string,
): Promise<GroupThreadMessage[]> {
  const rows = await dbAll<
    {
      id: string;
      conversation_id: string;
      sender_account_id: string;
      sender_display_name: string;
      kind: "text" | "media" | "system_notice";
      body_text: string | null;
      created_at: string;
      edited_at: string | null;
      reactions_json: string | null;
      read_by_count: number;
      reply_to_message_id: string | null;
      reply_to_text: string | null;
      reply_to_sender_display_name: string | null;
    } & RelayHostedAttachmentRow
  >(
    env.DB,
    `SELECT
       m.id,
       m.conversation_id,
       m.sender_account_id,
       sender.display_name AS sender_display_name,
       m.kind,
       m.body_text,
       m.created_at,
       m.edited_at,
      m.reactions_json,
       m.reply_to_message_id,
       m.reply_to_text,
       m.reply_to_sender_display_name,
       a.id AS attachment_id,
       a.file_name,
       a.mime_type,
       a.byte_length,
       a.plaintext_byte_length,
       a.content_class,
       a.retention_mode,
       a.protection_profile,
       a.preview_blur_hash,
       a.encryption_mode,
       a.attachment_key_box,
       a.attachment_iv_box,
       (
         SELECT COUNT(*)
           FROM message_reads r
          WHERE r.conversation_id = m.conversation_id
            AND r.last_read_at >= m.created_at
            AND r.account_id != m.sender_account_id
       ) AS read_by_count
     FROM conversation_messages m
     JOIN accounts sender ON sender.id = m.sender_account_id
     LEFT JOIN attachments a ON a.id = m.attachment_id
    WHERE m.conversation_id = ?1
      AND m.deleted_at IS NULL
    ORDER BY m.created_at DESC
    LIMIT ?2`,
    conversationId,
    limit,
  );

  const expiresAtMs = Date.now() + 30 * 60 * 1000;
  const messages: GroupThreadMessage[] = [];

  for (const row of rows.reverse()) {
    const attachment = await buildRelayHostedAttachment(env, row, expiresAtMs);

    messages.push({
      id: row.id,
      conversationId: row.conversation_id,
      historyMode: "relay_hosted",
      senderAccountId: row.sender_account_id,
      senderDisplayName: row.sender_display_name,
      kind: row.kind,
      text: row.body_text,
      attachment,
      createdAt: row.created_at,
      editedAt: row.edited_at ?? null,
      reactions: parseMessageReactions(row.reactions_json),
      readByCount: row.read_by_count ?? 0,
      replyTo: row.reply_to_message_id
        ? {
            messageId: row.reply_to_message_id,
            text: row.reply_to_text ?? null,
            senderDisplayName: row.reply_to_sender_display_name ?? "",
          }
        : null,
    });
  }

  return messages;
}

export async function createRelayHostedConversationMessage(
  env: Env,
  input: {
    conversationId: string;
    senderAccountId: string;
    senderDeviceId?: string | null;
    text?: string | null;
    attachmentId?: string | null;
    clientMessageId?: string | null;
    replyToMessageId?: string | null;
  },
): Promise<GroupThreadMessage> {
  const sender = await dbFirst<{ display_name: string }>(
    env.DB,
    "SELECT display_name FROM accounts WHERE id = ?1",
    input.senderAccountId,
  );
  const conversation = await dbFirst<{ title: string | null }>(
    env.DB,
    "SELECT title FROM conversations WHERE id = ?1",
    input.conversationId,
  );

  let attachment: {
    id: string;
    file_name: string;
    mime_type: string;
    byte_length: number;
    plaintext_byte_length: number | null;
    content_class: "image" | "video" | "audio" | "file";
    retention_mode: "private_vault" | "ephemeral";
    protection_profile: "sensitive_media" | "standard";
    preview_blur_hash: string | null;
    encryption_mode: "none" | "device_encrypted";
    attachment_key_box: string | null;
    attachment_iv_box: string | null;
    account_id: string;
    conversation_id: string | null;
  } | null = null;

  if (input.attachmentId) {
    attachment = await dbFirst<{
      id: string;
      file_name: string;
      mime_type: string;
      byte_length: number;
      plaintext_byte_length: number | null;
      content_class: "image" | "video" | "audio" | "file";
      retention_mode: "private_vault" | "ephemeral";
      protection_profile: "sensitive_media" | "standard";
      preview_blur_hash: string | null;
      encryption_mode: "none" | "device_encrypted";
      attachment_key_box: string | null;
      attachment_iv_box: string | null;
      account_id: string;
      conversation_id: string | null;
    }>(
      env.DB,
      `SELECT
         id,
         file_name,
         mime_type,
         byte_length,
         plaintext_byte_length,
         content_class,
         retention_mode,
         protection_profile,
         preview_blur_hash,
         encryption_mode,
         attachment_key_box,
         attachment_iv_box,
         account_id,
         conversation_id
       FROM attachments
      WHERE id = ?1`,
      input.attachmentId,
    );

    if (
      !attachment ||
      attachment.account_id !== input.senderAccountId ||
      attachment.conversation_id !== input.conversationId
    ) {
      throw new HttpError(
        403,
        "Attachment is not available for this conversation message",
        "FORBIDDEN",
      );
    }
  }

  // Look up reply target if provided
  let replyTarget: { body_text: string | null; sender_display_name: string } | null = null;
  if (input.replyToMessageId) {
    replyTarget = await dbFirst<{ body_text: string | null; sender_display_name: string }>(
      env.DB,
      `SELECT m.body_text, a.display_name AS sender_display_name
         FROM conversation_messages m
         JOIN accounts a ON a.id = m.sender_account_id
        WHERE m.id = ?1 AND m.conversation_id = ?2`,
      input.replyToMessageId,
      input.conversationId,
    ) ?? null;
  }

  const created = await appendConversationMessage(env, {
    conversationId: input.conversationId,
    senderAccountId: input.senderAccountId,
    kind: attachment ? "media" : "text",
    text: input.text ?? null,
    attachmentId: attachment?.id ?? null,
    clientMessageId: input.clientMessageId ?? null,
    replyToMessageId: input.replyToMessageId ?? null,
    replyToText: replyTarget?.body_text ?? null,
    replyToSenderDisplayName: replyTarget?.sender_display_name ?? null,
  });

  const expiresAtMs = Date.now() + 30 * 60 * 1000;
  const payload = {
    type: "message" as const,
    id: created.id,
    conversationId: input.conversationId,
    historyMode: "relay_hosted" as const,
    senderAccountId: input.senderAccountId,
    senderDisplayName:
      sender?.display_name ??
      conversationTitleForAccount(input.senderAccountId),
    kind: attachment ? ("media" as const) : ("text" as const),
    text: input.text ?? null,
    replyTo: input.replyToMessageId
      ? {
          messageId: input.replyToMessageId,
          text: replyTarget?.body_text ?? null,
          senderDisplayName: replyTarget?.sender_display_name ?? "",
        }
      : null,
    attachment: attachment
      ? await buildRelayHostedAttachment(
          env,
          {
            attachment_id: attachment.id,
            file_name: attachment.file_name,
            mime_type: attachment.mime_type,
            byte_length: attachment.byte_length,
            plaintext_byte_length: attachment.plaintext_byte_length,
            content_class: attachment.content_class,
            retention_mode: attachment.retention_mode,
            protection_profile: attachment.protection_profile,
            preview_blur_hash: attachment.preview_blur_hash,
            encryption_mode: attachment.encryption_mode,
            attachment_key_box: attachment.attachment_key_box,
            attachment_iv_box: attachment.attachment_iv_box,
          },
          expiresAtMs,
        )
      : null,
    reactions: {},
    createdAt: created.createdAt,
  };

  const doId = env.GROUP_COORDINATOR.idFromName(input.conversationId);
  const stub = env.GROUP_COORDINATOR.get(doId);
  await stub
    .fetch("http://do/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    .catch(() => {}); // Fire and forget errors on broadcast

  const recipientDevices = await dbAll<{ id: string }>(
    env.DB,
    `SELECT DISTINCT d.id
       FROM conversation_members cm
       JOIN devices d ON d.account_id = cm.account_id
      WHERE cm.conversation_id = ?1
        AND cm.removed_at IS NULL
        AND d.revoked_at IS NULL
        AND (?2 IS NULL OR d.id != ?2)`,
    input.conversationId,
    input.senderDeviceId ?? null,
  );

  await Promise.all(
    recipientDevices.map((device) =>
      queuePushWake(env, {
        targetDeviceId: device.id,
        reason: "relay_hosted_message",
        conversationId: input.conversationId,
        conversationTitle: conversation?.title ?? null,
        senderDisplayName: payload.senderDisplayName,
        historyMode: "relay_hosted",
        messageKind: payload.kind,
        sentAt: payload.createdAt,
      }).catch((error) => {
        console.error("push_queue_enqueue_failed", {
          deviceId: device.id,
          conversationId: input.conversationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }),
    ),
  );

  return payload;
}
