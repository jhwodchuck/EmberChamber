import { decryptAttachmentBytes } from "@emberchamber/protocol";
import { Directory, File as ExpoFile, Paths } from "expo-file-system";
import { Linking } from "react-native";
import type { GroupThreadMessage } from "../types";

const ATTACHMENT_CACHE_DIRECTORY = "managed-attachments";
const EPHEMERAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const PRIVATE_VAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ManagedAttachment = NonNullable<NonNullable<GroupThreadMessage["attachment"]>>;
export type AttachmentTransferState = "idle" | "downloading" | "decrypting" | "ready" | "failed";

type RefreshAttachmentAccess = () => Promise<ManagedAttachment | null>;

export function getAttachmentActionLabel(attachment: ManagedAttachment) {
  if (attachment.contentClass === "audio") {
    return "Play audio";
  }

  if (attachment.contentClass === "video") {
    return "Play video";
  }

  return "Open attachment";
}

function sanitizeAttachmentFileName(value: string) {
  const normalized = value.trim().replace(/[^\w.-]+/g, "-");
  return normalized || "attachment.bin";
}

function getCacheRetentionPrefix(attachment: ManagedAttachment) {
  return attachment.retentionMode === "ephemeral" ? "ephemeral" : "vault";
}

function getAttachmentCacheDirectory() {
  const cacheDirectory = new Directory(Paths.cache, ATTACHMENT_CACHE_DIRECTORY);
  if (!cacheDirectory.exists) {
    cacheDirectory.create({ idempotent: true, intermediates: true });
  }

  return cacheDirectory;
}

function getAttachmentCacheFile(attachment: ManagedAttachment) {
  const cacheDirectory = getAttachmentCacheDirectory();
  return new ExpoFile(
    cacheDirectory,
    `${getCacheRetentionPrefix(attachment)}-${attachment.id}-${sanitizeAttachmentFileName(attachment.fileName)}`,
  );
}

function getCacheTtlMsFromFile(file: ExpoFile) {
  return file.name.startsWith("ephemeral-")
    ? EPHEMERAL_CACHE_TTL_MS
    : PRIVATE_VAULT_CACHE_TTL_MS;
}

export function describeAttachmentTransferState(status: AttachmentTransferState) {
  if (status === "downloading") {
    return "Downloading attachment…";
  }

  if (status === "decrypting") {
    return "Decrypting attachment…";
  }

  if (status === "ready") {
    return "Attachment ready on this device.";
  }

  if (status === "failed") {
    return "Attachment failed to load.";
  }

  return "";
}

async function ensureAttachmentDownloadUrl(
  attachment: ManagedAttachment,
  refreshAttachmentAccess?: RefreshAttachmentAccess,
): Promise<ManagedAttachment & { downloadUrl: string }> {
  if (attachment.downloadUrl) {
    return {
      ...attachment,
      downloadUrl: attachment.downloadUrl,
    };
  }

  if (!refreshAttachmentAccess) {
    throw new Error("Attachment link is unavailable.");
  }

  const refreshedAttachment = await refreshAttachmentAccess();
  if (refreshedAttachment?.downloadUrl) {
    return {
      ...refreshedAttachment,
      downloadUrl: refreshedAttachment.downloadUrl,
    };
  }

  throw new Error("Attachment link is unavailable.");
}

async function downloadAttachmentBytes(
  attachment: ManagedAttachment,
  refreshAttachmentAccess?: RefreshAttachmentAccess,
) {
  let resolvedAttachment = await ensureAttachmentDownloadUrl(
    attachment,
    refreshAttachmentAccess,
  );
  let response = await fetch(resolvedAttachment.downloadUrl);

  if (!response.ok && refreshAttachmentAccess) {
    const refreshedAttachment = await refreshAttachmentAccess();
    if (
      refreshedAttachment?.downloadUrl &&
      refreshedAttachment.downloadUrl !== resolvedAttachment.downloadUrl
    ) {
      resolvedAttachment = {
        ...refreshedAttachment,
        downloadUrl: refreshedAttachment.downloadUrl,
      };
      response = await fetch(resolvedAttachment.downloadUrl);
    }
  }

  if (!response.ok) {
    throw new Error("Unable to download the attachment.");
  }

  return {
    attachment: resolvedAttachment,
    bytes: await response.arrayBuffer(),
  };
}

export function pruneManagedAttachmentCache(now = Date.now()) {
  const cacheDirectory = new Directory(Paths.cache, ATTACHMENT_CACHE_DIRECTORY);
  if (!cacheDirectory.exists) {
    return 0;
  }

  let deletedCount = 0;
  for (const entry of cacheDirectory.list()) {
    if (!(entry instanceof ExpoFile)) {
      continue;
    }

    const ttlMs = getCacheTtlMsFromFile(entry);
    const updatedAt = entry.modificationTime ?? entry.creationTime ?? 0;
    if (updatedAt > 0 && now - updatedAt <= ttlMs) {
      continue;
    }

    try {
      entry.delete();
      deletedCount += 1;
    } catch {
      // Ignore cleanup failures and keep the file if it cannot be removed.
    }
  }

  return deletedCount;
}

export async function resolveAttachmentUri(
  attachment: ManagedAttachment,
  onStatusChange?: (status: AttachmentTransferState) => void,
  refreshAttachmentAccess?: RefreshAttachmentAccess,
) {
  pruneManagedAttachmentCache();

  const localFile = getAttachmentCacheFile(attachment);
  if (localFile.exists && (localFile.size ?? 0) > 0) {
    onStatusChange?.("ready");
    return localFile.contentUri || localFile.uri;
  }

  onStatusChange?.("downloading");

  if (attachment.encryptionMode === "device_encrypted") {
    if (!attachment.fileKeyB64 || !attachment.fileIvB64) {
      throw new Error("Attachment keys are missing.");
    }

    const { bytes: ciphertext } = await downloadAttachmentBytes(
      attachment,
      refreshAttachmentAccess,
    );
    onStatusChange?.("decrypting");
    const plain = decryptAttachmentBytes(
      ciphertext,
      attachment.fileKeyB64,
      attachment.fileIvB64,
    );
    localFile.create({ intermediates: true, overwrite: true });
    localFile.write(plain);
    onStatusChange?.("ready");
    return localFile.contentUri || localFile.uri;
  }

  const { bytes } = await downloadAttachmentBytes(
    attachment,
    refreshAttachmentAccess,
  );
  localFile.create({ intermediates: true, overwrite: true });
  localFile.write(new Uint8Array(bytes));
  onStatusChange?.("ready");
  return localFile.contentUri || localFile.uri;
}

export async function openManagedAttachment(
  attachment: ManagedAttachment,
  onStatusChange?: (status: AttachmentTransferState) => void,
  refreshAttachmentAccess?: RefreshAttachmentAccess,
) {
  const localUri = await resolveAttachmentUri(
    attachment,
    onStatusChange,
    refreshAttachmentAccess,
  );

  try {
    await Linking.openURL(localUri);
  } catch {
    if (attachment.downloadUrl) {
      await Linking.openURL(attachment.downloadUrl);
      return attachment.downloadUrl;
    }

    throw new Error("Unable to open this attachment.");
  }

  return localUri;
}
