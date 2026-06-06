import { type CipherEnvelope } from "@emberchamber/protocol";
import {
  requireAuth,
  requireAccessTokenSession,
  parseClientMetadata,
} from "../middleware/auth";
import { mailboxAckSchema, messageBatchSchema, messageGroupSchema } from "../schemas";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { scheduleCleanup } from "../services/cleanup";
import {
  enqueueEnvelope,
  updateConversationActivity,
} from "../services/conversations";
import { queuePushWake } from "../services/push";
import { conversationTitleForAccount } from "../services/utils";
import type { Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/v1/messages/batch") {
    const auth = await requireAuth(request, env);
    const body = messageBatchSchema.parse(await readJson(request));
    const conversation = await dbFirst<{
      kind: "direct_message" | "group";
      epoch: number;
    }>(
      env.DB,
      "SELECT kind, epoch FROM conversations WHERE id = ?1",
      body.conversationId,
    );

    if (!conversation) {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      body.conversationId,
      auth.accountId,
    );

    if (!membership) {
      throw new HttpError(
        403,
        "Not a member of this conversation",
        "FORBIDDEN",
      );
    }

    if (conversation.epoch !== body.epoch) {
      throw new HttpError(409, "Conversation epoch changed", "STALE_EPOCH");
    }

    const devices = await dbAll<{ id: string; account_id: string }>(
      env.DB,
      "SELECT id, account_id FROM devices WHERE revoked_at IS NULL",
    );
    const deviceMap = new Map(devices.map((device) => [device.id, device]));
    const memberRows = await dbAll<{ account_id: string }>(
      env.DB,
      "SELECT account_id FROM conversation_members WHERE conversation_id = ?1 AND removed_at IS NULL",
      body.conversationId,
    );
    const memberSet = new Set(memberRows.map((row) => row.account_id));

    const accepted: string[] = [];
    const acceptedPushRecipients = new Set<string>();
    const blockedRecipients: string[] = [];
    const rejectedRecipients: string[] = [];
    const duplicateEnvelopeIds: string[] = [];
    for (const item of body.envelopes) {
      const recipient = deviceMap.get(item.recipientDeviceId);
      if (!recipient || !memberSet.has(recipient.account_id)) {
        rejectedRecipients.push(item.recipientDeviceId);
        continue;
      }

      const blocked = await dbFirst<{ account_id: string }>(
        env.DB,
        `SELECT account_id
           FROM blocks
          WHERE account_id = ?1 AND blocked_account_id = ?2`,
        recipient.account_id,
        auth.accountId,
      );
      if (blocked) {
        blockedRecipients.push(item.recipientDeviceId);
        continue;
      }

      const existingEnvelope = await dbFirst<{ envelope_id: string }>(
        env.DB,
        `SELECT envelope_id
           FROM mailbox_dedup
          WHERE conversation_id = ?1
            AND sender_device_id = ?2
            AND recipient_device_id = ?3
            AND client_message_id = ?4
            AND expires_at > ?5`,
        body.conversationId,
        auth.deviceId,
        item.recipientDeviceId,
        item.clientMessageId,
        new Date().toISOString(),
      );

      if (existingEnvelope) {
        accepted.push(existingEnvelope.envelope_id);
        duplicateEnvelopeIds.push(existingEnvelope.envelope_id);
        continue;
      }

      const envelope: CipherEnvelope = {
        envelopeId: crypto.randomUUID(),
        conversationId: body.conversationId,
        epoch: body.epoch,
        senderAccountId: auth.accountId,
        senderDeviceId: auth.deviceId,
        recipientDeviceId: item.recipientDeviceId,
        ciphertext: item.ciphertext,
        attachmentIds: item.attachmentIds,
        clientMessageId: item.clientMessageId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const enqueueResult = await enqueueEnvelope(env, envelope);
      if (!enqueueResult.queued) {
        rejectedRecipients.push(item.recipientDeviceId);
        continue;
      }

      await dbRun(
        env.DB,
        `INSERT INTO mailbox_dedup (
           conversation_id,
           sender_device_id,
           recipient_device_id,
           client_message_id,
           envelope_id,
           created_at,
           expires_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        body.conversationId,
        auth.deviceId,
        item.recipientDeviceId,
        item.clientMessageId,
        envelope.envelopeId,
        envelope.createdAt,
        envelope.expiresAt,
      );
      accepted.push(envelope.envelopeId);
      acceptedPushRecipients.add(item.recipientDeviceId);
    }

    if (accepted.length > 0) {
      const sender = await dbFirst<{ display_name: string }>(
        env.DB,
        "SELECT display_name FROM accounts WHERE id = ?1",
        auth.accountId,
      );
      await updateConversationActivity(env, body.conversationId, {
        at: new Date().toISOString(),
        kind: "mailbox",
      });
      await scheduleCleanup(env, "message_batch");
      await Promise.all(
        Array.from(acceptedPushRecipients).map((deviceId) =>
          queuePushWake(env, {
            targetDeviceId: deviceId,
            reason: "mailbox",
            conversationId: body.conversationId,
            senderDisplayName:
              sender?.display_name ??
              conversationTitleForAccount(auth.accountId),
            historyMode: "device_encrypted",
            messageKind: "mailbox",
          }).catch((error) => {
            console.error("push_queue_enqueue_failed", {
              deviceId,
              conversationId: body.conversationId,
              error: error instanceof Error ? error.message : String(error),
            });
          }),
        ),
      );
    }

    return json(
      {
        acceptedEnvelopeIds: accepted,
        duplicateEnvelopeIds,
        blockedRecipients,
        rejectedRecipients,
      },
      { status: 202 },
    );
  }

  if (request.method === "POST" && pathname === "/v1/messages/group") {
    const auth = await requireAuth(request, env);
    const body = messageGroupSchema.parse(await readJson(request));
    const conversation = await dbFirst<{
      kind: "direct_message" | "group";
      epoch: number;
    }>(
      env.DB,
      "SELECT kind, epoch FROM conversations WHERE id = ?1",
      body.conversationId,
    );

    if (!conversation) {
      throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
    }

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      body.conversationId,
      auth.accountId,
    );

    if (!membership) {
      throw new HttpError(403, "Not a member of this conversation", "FORBIDDEN");
    }

    if (conversation.epoch !== body.epoch) {
      throw new HttpError(409, "Conversation epoch changed", "STALE_EPOCH");
    }

    const devices = await dbAll<{ id: string; account_id: string }>(
      env.DB,
      "SELECT id, account_id FROM devices WHERE revoked_at IS NULL",
    );
    const deviceMap = new Map(devices.map((device) => [device.id, device]));
    const memberRows = await dbAll<{ account_id: string }>(
      env.DB,
      "SELECT account_id FROM conversation_members WHERE conversation_id = ?1 AND removed_at IS NULL",
      body.conversationId,
    );
    const memberSet = new Set(memberRows.map((row) => row.account_id));

    const recipientDevices = devices.filter(
      (device) => memberSet.has(device.account_id) && device.id !== auth.deviceId
    );

    const accepted: string[] = [];
    const acceptedPushRecipients = new Set<string>();

    for (const recipient of recipientDevices) {
      const blocked = await dbFirst<{ account_id: string }>(
        env.DB,
        `SELECT account_id
           FROM blocks
          WHERE account_id = ?1 AND blocked_account_id = ?2`,
        recipient.account_id,
        auth.accountId,
      );
      if (blocked) {
        continue;
      }

      const existingEnvelope = await dbFirst<{ envelope_id: string }>(
        env.DB,
        `SELECT envelope_id
           FROM mailbox_dedup
          WHERE conversation_id = ?1
            AND sender_device_id = ?2
            AND recipient_device_id = ?3
            AND client_message_id = ?4
            AND expires_at > ?5`,
        body.conversationId,
        auth.deviceId,
        recipient.id,
        body.clientMessageId,
        new Date().toISOString(),
      );

      if (existingEnvelope) {
        accepted.push(existingEnvelope.envelope_id);
        continue;
      }

      const envelope: CipherEnvelope = {
        envelopeId: crypto.randomUUID(),
        conversationId: body.conversationId,
        epoch: body.epoch,
        senderAccountId: auth.accountId,
        senderDeviceId: auth.deviceId,
        recipientDeviceId: recipient.id,
        ciphertext: body.ciphertext,
        attachmentIds: body.attachmentIds,
        clientMessageId: body.clientMessageId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const enqueueResult = await enqueueEnvelope(env, envelope);
      if (!enqueueResult.queued) {
        continue;
      }

      await dbRun(
        env.DB,
        `INSERT INTO mailbox_dedup (
           conversation_id,
           sender_device_id,
           recipient_device_id,
           client_message_id,
           envelope_id,
           created_at,
           expires_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        body.conversationId,
        auth.deviceId,
        recipient.id,
        body.clientMessageId,
        envelope.envelopeId,
        envelope.createdAt,
        envelope.expiresAt,
      );
      accepted.push(envelope.envelopeId);
      acceptedPushRecipients.add(recipient.id);
    }

    if (accepted.length > 0) {
      const sender = await dbFirst<{ display_name: string }>(
        env.DB,
        "SELECT display_name FROM accounts WHERE id = ?1",
        auth.accountId,
      );
      await updateConversationActivity(env, body.conversationId, {
        at: new Date().toISOString(),
        kind: "mailbox",
      });
      await scheduleCleanup(env, "message_batch");
      await Promise.all(
        Array.from(acceptedPushRecipients).map((deviceId) =>
          queuePushWake(env, {
            targetDeviceId: deviceId,
            reason: "mailbox",
            conversationId: body.conversationId,
            senderDisplayName:
              sender?.display_name ??
              conversationTitleForAccount(auth.accountId),
            historyMode: "device_encrypted",
            messageKind: "mailbox",
          }).catch((error) => {
            console.error("push_queue_enqueue_failed", {
              deviceId,
              conversationId: body.conversationId,
              error: error instanceof Error ? error.message : String(error),
            });
          }),
        ),
      );
    }

    return json({ acceptedEnvelopeIds: accepted });
  }

  if (request.method === "GET" && pathname === "/v1/mailbox/sync") {
    const auth = await requireAuth(request, env);
    const id = env.DEVICE_MAILBOX.idFromName(auth.deviceId);
    const stub = env.DEVICE_MAILBOX.get(id);
    const after = url.searchParams.get("after");
    const limit = url.searchParams.get("limit") ?? "50";
    return await stub.fetch(
      `https://do/sync?after=${encodeURIComponent(after ?? "")}&limit=${encodeURIComponent(limit)}`,
    );
  }

  if (
    request.method === "GET" &&
    pathname === "/v1/mailbox/ws" &&
    request.headers.get("Upgrade") === "websocket"
  ) {
    const token = url.searchParams.get("token");
    if (!token) {
      throw new HttpError(
        401,
        "Missing websocket auth token",
        "INVALID_TOKEN",
      );
    }

    const auth = await requireAccessTokenSession(
      token,
      env,
      parseClientMetadata(request),
    );

    const device = await dbFirst<{ id: string }>(
      env.DB,
      `SELECT id
         FROM devices
        WHERE id = ?1 AND account_id = ?2`,
      auth.deviceId,
      auth.accountId,
    );
    if (!device) {
      throw new HttpError(
        403,
        "Device is not available for this account",
        "FORBIDDEN",
      );
    }

    const id = env.DEVICE_MAILBOX.idFromName(auth.deviceId);
    const stub = env.DEVICE_MAILBOX.get(id);
    return stub.fetch(new Request("https://do/ws", request));
  }

  if (request.method === "POST" && pathname === "/v1/mailbox/ack") {
    const auth = await requireAuth(request, env);
    const body = mailboxAckSchema.parse(await readJson(request));
    const id = env.DEVICE_MAILBOX.idFromName(auth.deviceId);
    const stub = env.DEVICE_MAILBOX.get(id);
    return await stub.fetch("https://do/ack", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  return null;
}
