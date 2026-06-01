import type { GroupThreadMessage } from "@emberchamber/protocol";
import { decryptString, signValue } from "../lib/crypto";
import { HttpError } from "../lib/http";
import type { Env, RelayHostedAttachmentRow } from "../types";
import { attachmentMetadataSecret } from "./utils";

export async function sha256B64(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(digest);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

export async function parseAttachmentToken(
  env: Env,
  token: string,
  attachmentId: string,
  action: "upload" | "download",
) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new HttpError(
      401,
      "Invalid attachment token",
      "INVALID_ATTACHMENT_TOKEN",
    );
  }

  const expected = await signValue(
    env.EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET,
    payload,
  );
  if (expected !== signature) {
    throw new HttpError(
      401,
      "Invalid attachment token",
      "INVALID_ATTACHMENT_TOKEN",
    );
  }

  const data = JSON.parse(atob(payload)) as {
    attachmentId: string;
    action: "upload" | "download";
    exp: number;
  };
  if (
    data.attachmentId !== attachmentId ||
    data.action !== action ||
    data.exp <= Date.now()
  ) {
    throw new HttpError(
      401,
      "Expired attachment token",
      "ATTACHMENT_TOKEN_EXPIRED",
    );
  }
}

export async function signAttachmentToken(
  env: Env,
  attachmentId: string,
  action: "upload" | "download",
  expiresAtMs: number,
): Promise<string> {
  const payload = btoa(
    JSON.stringify({ attachmentId, action, exp: expiresAtMs }),
  );
  const signature = await signValue(
    env.EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET,
    payload,
  );
  return `${payload}.${signature}`;
}

export async function buildRelayHostedAttachment(
  env: Env,
  row: RelayHostedAttachmentRow,
  expiresAtMs: number,
): Promise<GroupThreadMessage["attachment"]> {
  if (
    !row.attachment_id ||
    !row.file_name ||
    !row.mime_type ||
    row.byte_length === null ||
    !row.content_class ||
    !row.retention_mode ||
    !row.protection_profile
  ) {
    return null;
  }

  const fileKeyB64 = row.attachment_key_box
    ? await decryptString(attachmentMetadataSecret(env), row.attachment_key_box)
    : null;
  const fileIvB64 = row.attachment_iv_box
    ? await decryptString(attachmentMetadataSecret(env), row.attachment_iv_box)
    : null;

  return {
    id: row.attachment_id,
    downloadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${row.attachment_id}?token=${encodeURIComponent(
      await signAttachmentToken(
        env,
        row.attachment_id,
        "download",
        expiresAtMs,
      ),
    )}`,
    fileName: row.file_name,
    mimeType: row.mime_type,
    byteLength: row.plaintext_byte_length ?? row.byte_length,
    contentClass: row.content_class,
    retentionMode: row.retention_mode,
    protectionProfile: row.protection_profile,
    previewBlurHash: row.preview_blur_hash,
    encryptionMode: row.encryption_mode ?? "none",
    fileKeyB64,
    fileIvB64,
  };
}
