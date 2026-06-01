import { type AttachmentTicket } from "@emberchamber/protocol";
import { requireAuth } from "../middleware/auth";
import { attachmentTicketSchema } from "../schemas";
import { dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { scheduleCleanup } from "../services/cleanup";
import {
  parseAttachmentToken,
  sha256B64,
  signAttachmentToken,
} from "../services/attachments";
import {
  coerceConversationHistoryMode,
} from "../services/conversations";
import { encryptString } from "../lib/crypto";
import { attachmentMetadataSecret } from "../services/utils";
import type { Env, RelayConversationKind } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/v1/attachments/ticket") {
    const auth = await requireAuth(request, env);
    const body = attachmentTicketSchema.parse(await readJson(request));
    const attachmentId = crypto.randomUUID();
    const r2Key = `${auth.accountId}/${attachmentId}/${body.fileName}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const createdAt = new Date().toISOString();
    const attachmentRetentionExpiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const storedByteLength = body.ciphertextByteLength ?? body.byteLength;
    const storedSha256 = body.ciphertextSha256B64 ?? body.sha256B64;
    const plaintextByteLength = body.plaintextByteLength ?? body.byteLength;
    const plaintextSha256 = body.plaintextSha256B64 ?? body.sha256B64;
    let attachmentKeyBox: string | null = null;
    let attachmentIvBox: string | null = null;

    if (!storedByteLength) {
      throw new HttpError(
        400,
        "Attachment byte length is required",
        "ATTACHMENT_LENGTH_REQUIRED",
      );
    }

    if (body.conversationId) {
      const conversation = await dbFirst<{
        epoch: number;
        kind: RelayConversationKind;
        history_mode: string | null;
      }>(
        env.DB,
        `SELECT epoch
                , kind
                , history_mode
           FROM conversations
          WHERE id = ?1`,
        body.conversationId,
      );
      const membership = await dbFirst<{ account_id: string }>(
        env.DB,
        `SELECT account_id
           FROM conversation_members
          WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
        body.conversationId,
        auth.accountId,
      );

      if (!conversation || !membership) {
        throw new HttpError(
          403,
          "Not allowed to attach media to this conversation",
          "FORBIDDEN",
        );
      }

      if (
        body.conversationEpoch &&
        conversation.epoch !== body.conversationEpoch
      ) {
        throw new HttpError(
          409,
          "Conversation epoch changed",
          "STALE_EPOCH",
        );
      }

      const historyMode = coerceConversationHistoryMode(
        conversation.history_mode,
        conversation.kind,
      );
      if (
        historyMode === "relay_hosted" &&
        body.encryptionMode === "device_encrypted"
      ) {
        if (!body.fileKeyB64 || !body.fileIvB64) {
          throw new HttpError(
            400,
            "Relay-hosted encrypted attachments need file key material.",
            "ATTACHMENT_KEY_MATERIAL_REQUIRED",
          );
        }

        const metadataSecret = attachmentMetadataSecret(env);
        attachmentKeyBox = await encryptString(metadataSecret, body.fileKeyB64);
        attachmentIvBox = await encryptString(metadataSecret, body.fileIvB64);
      }
    }

    await dbRun(
      env.DB,
      `INSERT INTO attachments (
         id,
         account_id,
         r2_key,
         file_name,
         mime_type,
         byte_length,
         encryption_mode,
         ciphertext_byte_length,
         ciphertext_sha256_b64,
         plaintext_byte_length,
         plaintext_sha256_b64,
         sha256_b64,
         created_at,
         uploaded_at,
         last_accessed_at,
         expires_at,
         content_class,
         retention_mode,
         protection_profile,
         preview_blur_hash,
         attachment_key_box,
         attachment_iv_box,
         conversation_id,
         conversation_epoch,
         upload_completed_at
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, NULL)`,
      attachmentId,
      auth.accountId,
      r2Key,
      body.fileName,
      body.mimeType,
      storedByteLength,
      body.encryptionMode,
      body.ciphertextByteLength ?? null,
      storedSha256 ?? null,
      plaintextByteLength ?? null,
      plaintextSha256 ?? null,
      body.sha256B64 ?? null,
      createdAt,
      attachmentRetentionExpiresAt,
      body.contentClass,
      body.retentionMode,
      body.protectionProfile,
      body.previewBlurHash ?? null,
      attachmentKeyBox,
      attachmentIvBox,
      body.conversationId ?? null,
      body.conversationEpoch ?? null,
    );
    await scheduleCleanup(env, "attachment_ticket");

    const uploadToken = await signAttachmentToken(
      env,
      attachmentId,
      "upload",
      expiresAt.getTime(),
    );
    const downloadToken = await signAttachmentToken(
      env,
      attachmentId,
      "download",
      expiresAt.getTime(),
    );

    const response: AttachmentTicket = {
      attachmentId,
      uploadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/upload/${attachmentId}?token=${encodeURIComponent(uploadToken)}`,
      downloadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${attachmentId}?token=${encodeURIComponent(downloadToken)}`,
      expiresAt: expiresAt.toISOString(),
      maxBytes: storedByteLength,
      encryptionMode: body.encryptionMode,
      contentClass: body.contentClass,
      retentionMode: body.retentionMode,
      protectionProfile: body.protectionProfile,
      previewBlurHash: body.previewBlurHash,
    };
    return json(response, { status: 201 });
  }

  const attachmentAccessMatch = pathname.match(
    /^\/v1\/attachments\/([0-9a-f-]{36})\/access$/i,
  );
  if (request.method === "GET" && attachmentAccessMatch) {
    const auth = await requireAuth(request, env);
    const attachmentId = attachmentAccessMatch[1];
    const attachment = await dbFirst<{
      id: string;
      conversation_id: string | null;
      account_id: string;
      deleted_at: string | null;
      expires_at: string;
    }>(
      env.DB,
      `SELECT id, conversation_id, account_id, deleted_at, expires_at
         FROM attachments
        WHERE id = ?1`,
      attachmentId,
    );

    if (!attachment) {
      throw new HttpError(
        404,
        "Attachment not found",
        "ATTACHMENT_NOT_FOUND",
      );
    }

    if (
      attachment.deleted_at ||
      attachment.expires_at <= new Date().toISOString()
    ) {
      throw new HttpError(
        410,
        "Attachment is no longer available",
        "ATTACHMENT_EXPIRED",
      );
    }

    if (attachment.conversation_id) {
      const membership = await dbFirst<{ account_id: string }>(
        env.DB,
        `SELECT account_id
           FROM conversation_members
          WHERE conversation_id = ?1
            AND account_id = ?2
            AND removed_at IS NULL`,
        attachment.conversation_id,
        auth.accountId,
      );

      if (!membership) {
        throw new HttpError(
          403,
          "Attachment is not available to this account",
          "FORBIDDEN",
        );
      }
    } else if (attachment.account_id !== auth.accountId) {
      throw new HttpError(
        403,
        "Attachment is not available to this account",
        "FORBIDDEN",
      );
    }

    const expiresAtMs = Date.now() + 30 * 60 * 1000;
    return json({
      attachmentId,
      downloadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${attachmentId}?token=${encodeURIComponent(
        await signAttachmentToken(env, attachmentId, "download", expiresAtMs),
      )}`,
      expiresAt: new Date(expiresAtMs).toISOString(),
    });
  }

  const attachmentUploadMatch = pathname.match(
    /^\/v1\/attachments\/upload\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "PUT" && attachmentUploadMatch) {
    const attachmentId = attachmentUploadMatch[1];
    const token = url.searchParams.get("token");
    if (!token) {
      throw new HttpError(
        401,
        "Missing attachment token",
        "INVALID_ATTACHMENT_TOKEN",
      );
    }
    await parseAttachmentToken(env, token, attachmentId, "upload");

    const attachment = await dbFirst<{
      r2_key: string;
      mime_type: string;
      byte_length: number;
      encryption_mode: "none" | "device_encrypted";
      ciphertext_sha256_b64: string | null;
      plaintext_sha256_b64: string | null;
      upload_completed_at: string | null;
      deleted_at: string | null;
      expires_at: string;
    }>(
      env.DB,
      `SELECT
         r2_key,
         mime_type,
         byte_length,
         encryption_mode,
         ciphertext_sha256_b64,
         plaintext_sha256_b64,
         upload_completed_at,
         deleted_at,
         expires_at
       FROM attachments
      WHERE id = ?1`,
      attachmentId,
    );

    if (!attachment) {
      throw new HttpError(
        404,
        "Attachment ticket not found",
        "ATTACHMENT_NOT_FOUND",
      );
    }

    if (
      attachment.deleted_at ||
      attachment.expires_at <= new Date().toISOString()
    ) {
      throw new HttpError(410, "Attachment ticket expired", "ATTACHMENT_EXPIRED");
    }

    const bodyBytes = await request.arrayBuffer();
    if (bodyBytes.byteLength !== attachment.byte_length) {
      throw new HttpError(
        400,
        "Attachment byte length mismatch",
        "ATTACHMENT_LENGTH_MISMATCH",
      );
    }

    const expectedHash =
      attachment.encryption_mode === "device_encrypted"
        ? attachment.ciphertext_sha256_b64
        : attachment.plaintext_sha256_b64;
    if (expectedHash) {
      const actualHash = await sha256B64(bodyBytes);
      if (actualHash !== expectedHash) {
        throw new HttpError(
          400,
          "Attachment checksum mismatch",
          "ATTACHMENT_CHECKSUM_MISMATCH",
        );
      }
    }

    await env.ATTACHMENTS.put(attachment.r2_key, bodyBytes, {
      httpMetadata: { contentType: attachment.mime_type },
    });
    await dbRun(
      env.DB,
      `UPDATE attachments
          SET upload_completed_at = ?1,
              uploaded_at = COALESCE(uploaded_at, ?1)
        WHERE id = ?2`,
      new Date().toISOString(),
      attachmentId,
    );

    return json({ uploaded: true });
  }

  const attachmentDownloadMatch = pathname.match(
    /^\/v1\/attachments\/download\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "GET" && attachmentDownloadMatch) {
    const attachmentId = attachmentDownloadMatch[1];
    const token = url.searchParams.get("token");
    if (!token) {
      throw new HttpError(
        401,
        "Missing attachment token",
        "INVALID_ATTACHMENT_TOKEN",
      );
    }
    await parseAttachmentToken(env, token, attachmentId, "download");

    const attachment = await dbFirst<{
      r2_key: string;
      mime_type: string;
      deleted_at: string | null;
      expires_at: string;
      upload_completed_at: string | null;
    }>(
      env.DB,
      "SELECT r2_key, mime_type, deleted_at, expires_at, upload_completed_at FROM attachments WHERE id = ?1",
      attachmentId,
    );

    if (!attachment) {
      throw new HttpError(
        404,
        "Attachment not found",
        "ATTACHMENT_NOT_FOUND",
      );
    }

    if (
      attachment.deleted_at ||
      attachment.expires_at <= new Date().toISOString() ||
      !attachment.upload_completed_at
    ) {
      throw new HttpError(
        410,
        "Attachment is no longer available",
        "ATTACHMENT_EXPIRED",
      );
    }

    const object = await env.ATTACHMENTS.get(attachment.r2_key);
    if (!object) {
      throw new HttpError(
        404,
        "Encrypted attachment blob not found",
        "ATTACHMENT_BLOB_MISSING",
      );
    }

    await dbRun(
      env.DB,
      "UPDATE attachments SET last_accessed_at = ?1 WHERE id = ?2",
      new Date().toISOString(),
      attachmentId,
    );

    return new Response(await object.arrayBuffer(), {
      headers: {
        "content-type": attachment.mime_type,
        etag: object.httpEtag ?? "",
      },
    });
  }

  return null;
}
