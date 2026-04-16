import { File as ExpoFile } from "expo-file-system";
import { useCallback, useState } from "react";
import * as SQLite from "expo-sqlite";
import { encryptAttachmentBytes, encryptConversationPayload } from "@emberchamber/protocol";
import type { EncryptedConversationPayload } from "@emberchamber/protocol";
import type {
  AttachmentTicket,
  AuthSession,
  DeviceKeyBundle,
  FormMessage,
  GroupMembershipSummary,
  GroupThreadMessage,
  MeProfile,
  PendingAttachment,
} from "../types";
import {
  MAX_ATTACHMENT_BYTES,
} from "../constants";
import {
  makeOpaqueToken,
} from "../lib/utils";
import {
  countVaultItems,
  persistVaultMediaRecord,
  saveCachedGroupMessages,
} from "../lib/db";
import { loadStoredDeviceBundle } from "../lib/session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getContentClass(
  mimeType: string,
): "image" | "video" | "audio" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

async function loadPendingAttachmentFile(attachment: PendingAttachment) {
  const file = new ExpoFile(attachment.uri);
  if (!file.exists) {
    throw new Error("That photo is no longer available on this device.");
  }
  return file;
}

async function uploadAttachmentBytes(
  uploadUrl: string,
  mimeType: string,
  bytes: ArrayBuffer,
) {
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": mimeType },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    const uploadError = await uploadResponse.text();
    throw new Error(uploadError || "Attachment upload failed.");
  }
}

function mergeGroupThreadMessage(
  messages: GroupThreadMessage[],
  nextMessage: GroupThreadMessage,
) {
  return messages
    .filter((entry) => entry.id !== nextMessage.id)
    .concat(nextMessage)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

// ---------------------------------------------------------------------------
// Hook args and return
// ---------------------------------------------------------------------------

type UseSendMessageArgs = {
  session: AuthSession | null;
  selectedGroup: GroupMembershipSummary | null;
  messageDraft: string;
  pendingAttachment: PendingAttachment | null;
  editingMessageId: string | null;
  threadMessages: GroupThreadMessage[];
  profile: MeProfile | null;
  deviceLabel: string;
  db: SQLite.SQLiteDatabase | null;
  relayFetch: <T>(
    session: AuthSession,
    path: string,
    init?: RequestInit,
  ) => Promise<T>;
  listDeviceBundlesForAccount: (
    session: AuthSession,
    accountId: string,
  ) => Promise<DeviceKeyBundle[]>;
  setThreadMessages: (
    updater:
      | GroupThreadMessage[]
      | ((prev: GroupThreadMessage[]) => GroupThreadMessage[]),
  ) => void;
  setMessageDraft: (draft: string) => void;
  setPendingAttachment: (attachment: PendingAttachment | null) => void;
  setEditingMessageId: (id: string | null) => void;
  setSessionMessage: (message: FormMessage | null) => void;
  setVaultCount: (count: number) => void;
  refreshConversationCatalog: () => void;
};

export function useSendMessage({
  session,
  selectedGroup,
  messageDraft,
  pendingAttachment,
  editingMessageId,
  threadMessages,
  profile,
  deviceLabel,
  db,
  relayFetch,
  listDeviceBundlesForAccount,
  setThreadMessages,
  setMessageDraft,
  setPendingAttachment,
  setEditingMessageId,
  setSessionMessage,
  setVaultCount,
  refreshConversationCatalog,
}: UseSendMessageArgs) {
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const loadStoredBundleOrThrow = useCallback(
    async (currentSession: AuthSession) => {
      const bundle = await loadStoredDeviceBundle(currentSession.deviceId);
      if (!bundle?.privateKeyB64) {
        throw new Error("This device is missing its private message key.");
      }
      return bundle as DeviceKeyBundle["bundle"] & { privateKeyB64: string };
    },
    [],
  );

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      if (!session || !selectedGroup) {
        setSessionMessage({
          tone: "warning",
          title: "Pick a group first",
          body: "You need an active trusted circle before this phone can send a message.",
        });
        return;
      }

      const trimmedText = (overrideText ?? messageDraft).trim();
      if (!trimmedText && !pendingAttachment) {
        return;
      }

      setIsSendingMessage(true);
      setSessionMessage(null);

      try {
        // ---- edit existing message ----
        if (editingMessageId && selectedGroup.historyMode !== "device_encrypted") {
          await relayFetch<{ updated: boolean }>(
            session,
            `/v1/groups/${selectedGroup.id}/messages/${editingMessageId}`,
            {
              method: "PATCH",
              body: JSON.stringify({ text: trimmedText }),
            },
          );
          setThreadMessages((prev) =>
            prev.map((m) =>
              m.id === editingMessageId
                ? { ...m, text: trimmedText, editedAt: new Date().toISOString() }
                : m,
            ),
          );
          setMessageDraft("");
          setEditingMessageId(null);
          return;
        }

        let createdMessage: GroupThreadMessage;

        if (selectedGroup.historyMode === "device_encrypted") {
          const localBundle = await loadStoredBundleOrThrow(session);
          const conversation = await relayFetch<{
            id: string;
            kind: "group";
            epoch: number;
            memberAccountIds: string[];
            members: Array<{ accountId: string }>;
          }>(session, `/v1/conversations/${selectedGroup.id}`);

          const bundleLists = await Promise.all(
            Array.from(new Set(conversation.memberAccountIds)).map(
              async (accountId) => ({
                accountId,
                bundles: await listDeviceBundlesForAccount(session, accountId),
              }),
            ),
          );
          const recipientDevices = bundleLists
            .flatMap((entry) => entry.bundles)
            .filter((bundle) => bundle.deviceId !== session.deviceId);

          if (recipientDevices.length === 0) {
            throw new Error(
              "No member devices are registered for this encrypted group yet.",
            );
          }

          let attachment: GroupThreadMessage["attachment"] | null = null;
          const attachmentIds: string[] = [];

          if (pendingAttachment) {
            const attachmentFile = await loadPendingAttachmentFile(pendingAttachment);
            const fileBytes = await attachmentFile.bytes();

            if (fileBytes.byteLength > MAX_ATTACHMENT_BYTES) {
              throw new Error("That photo exceeds the 20 MB beta attachment limit.");
            }

            const encrypted = encryptAttachmentBytes(fileBytes);
            const ticket = await relayFetch<AttachmentTicket>(
              session,
              "/v1/attachments/ticket",
              {
                method: "POST",
                body: JSON.stringify({
                  fileName: pendingAttachment.fileName,
                  mimeType: "application/octet-stream",
                  encryptionMode: "device_encrypted",
                  ciphertextByteLength: encrypted.ciphertext.byteLength,
                  ciphertextSha256B64: encrypted.ciphertextSha256B64,
                  plaintextByteLength: encrypted.plaintext.byteLength,
                  plaintextSha256B64: encrypted.plaintextSha256B64,
                  conversationId: selectedGroup.id,
                  conversationEpoch: selectedGroup.epoch,
                  contentClass: getContentClass(pendingAttachment.mimeType),
                  retentionMode: "private_vault",
                  protectionProfile: selectedGroup.sensitiveMediaDefault
                    ? "sensitive_media"
                    : "standard",
                }),
              },
            );

            await uploadAttachmentBytes(
              ticket.uploadUrl,
              "application/octet-stream",
              encrypted.ciphertext,
            );

            attachment = {
              id: ticket.attachmentId,
              downloadUrl: ticket.downloadUrl,
              fileName: pendingAttachment.fileName,
              mimeType: pendingAttachment.mimeType,
              byteLength: fileBytes.byteLength,
              contentClass: getContentClass(pendingAttachment.mimeType),
              retentionMode: ticket.retentionMode,
              protectionProfile: ticket.protectionProfile,
              previewBlurHash: ticket.previewBlurHash ?? null,
              encryptionMode: ticket.encryptionMode,
              fileKeyB64: encrypted.fileKeyB64,
              fileIvB64: encrypted.fileIvB64,
            };
            attachmentIds.push(ticket.attachmentId);
          }

          const createdAt = new Date().toISOString();
          const clientMessageId = makeOpaqueToken();
          const senderDisplayName = profile?.displayName ?? deviceLabel;
          const payload: EncryptedConversationPayload = {
            version: 1,
            kind: "ember_conversation_v1",
            conversationId: selectedGroup.id,
            conversationKind: "group",
            historyMode: "device_encrypted",
            senderDisplayName,
            text: trimmedText || undefined,
            attachment: attachment
              ? {
                  id: attachment.id,
                  fileName: attachment.fileName,
                  mimeType: attachment.mimeType,
                  byteLength: attachment.byteLength,
                  contentClass: attachment.contentClass,
                  retentionMode: attachment.retentionMode,
                  protectionProfile: attachment.protectionProfile,
                  previewBlurHash: attachment.previewBlurHash ?? null,
                  encryptionMode: attachment.encryptionMode ?? "device_encrypted",
                  fileKeyB64: attachment.fileKeyB64 ?? null,
                  fileIvB64: attachment.fileIvB64 ?? null,
                }
              : null,
            createdAt,
            clientMessageId,
          };

          await relayFetch<{ acceptedEnvelopeIds: string[] }>(
            session,
            "/v1/messages/batch",
            {
              method: "POST",
              body: JSON.stringify({
                conversationId: selectedGroup.id,
                epoch: selectedGroup.epoch,
                envelopes: recipientDevices.map((bundle) => ({
                  recipientDeviceId: bundle.deviceId,
                  ciphertext: encryptConversationPayload(
                    payload,
                    bundle.bundle.identityKeyB64,
                    localBundle.privateKeyB64,
                  ),
                  clientMessageId,
                  attachmentIds,
                })),
              }),
            },
          );

          createdMessage = {
            id: clientMessageId,
            conversationId: selectedGroup.id,
            historyMode: "device_encrypted",
            senderAccountId: session.accountId,
            senderDisplayName,
            kind: attachment ? "media" : "text",
            text: trimmedText || undefined,
            attachment,
            createdAt,
          };
        } else {
          let attachmentId: string | undefined;

          if (pendingAttachment) {
            const attachmentFile = await loadPendingAttachmentFile(pendingAttachment);
            const fileBytes = await attachmentFile.bytes();

            if (fileBytes.byteLength > MAX_ATTACHMENT_BYTES) {
              throw new Error("That photo exceeds the 20 MB beta attachment limit.");
            }

            const ticket = await relayFetch<AttachmentTicket>(
              session,
              "/v1/attachments/ticket",
              {
                method: "POST",
                body: JSON.stringify({
                  fileName: pendingAttachment.fileName,
                  mimeType: pendingAttachment.mimeType,
                  byteLength: fileBytes.byteLength,
                  conversationId: selectedGroup.id,
                  conversationEpoch: selectedGroup.epoch,
                  contentClass: getContentClass(pendingAttachment.mimeType),
                  retentionMode: "private_vault",
                  protectionProfile: selectedGroup.sensitiveMediaDefault
                    ? "sensitive_media"
                    : "standard",
                }),
              },
            );

            await uploadAttachmentBytes(
              ticket.uploadUrl,
              pendingAttachment.mimeType,
              fileBytes.buffer.slice(
                fileBytes.byteOffset,
                fileBytes.byteOffset + fileBytes.byteLength,
              ),
            );

            attachmentId = ticket.attachmentId;
          }

          createdMessage = await relayFetch<GroupThreadMessage>(
            session,
            `/v1/groups/${selectedGroup.id}/messages`,
            {
              method: "POST",
              body: JSON.stringify({
                text: trimmedText || undefined,
                attachmentId,
                clientMessageId: makeOpaqueToken(),
              }),
            },
          );
        }

        const nextThreadMessages = mergeGroupThreadMessage(threadMessages, createdMessage);
        setThreadMessages(nextThreadMessages);
        if (!overrideText) setMessageDraft("");
        setPendingAttachment(null);

        if (db) {
          await saveCachedGroupMessages(db, selectedGroup.id, nextThreadMessages);
          refreshConversationCatalog();

          if (createdMessage.attachment) {
            await persistVaultMediaRecord(
              db,
              createdMessage,
              profile?.displayName ?? deviceLabel,
            );
            setVaultCount(await countVaultItems(db));
          }
        }
      } catch (error) {
        setSessionMessage({
          tone: "error",
          title: "Message failed to send",
          body:
            error instanceof Error
              ? error.message
              : "Unable to send this message right now.",
        });
      } finally {
        setIsSendingMessage(false);
      }
    },
    [
      db,
      deviceLabel,
      editingMessageId,
      listDeviceBundlesForAccount,
      loadStoredBundleOrThrow,
      messageDraft,
      pendingAttachment,
      profile,
      refreshConversationCatalog,
      relayFetch,
      selectedGroup,
      session,
      setEditingMessageId,
      setMessageDraft,
      setPendingAttachment,
      setSessionMessage,
      setThreadMessages,
      setVaultCount,
      threadMessages,
    ],
  );

  return { sendMessage, isSendingMessage };
}
