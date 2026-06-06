import { File as ExpoFile } from "expo-file-system";
import { useCallback, useState } from "react";
import * as SQLite from "expo-sqlite";
import {
  encryptAttachmentBytes,
  encryptConversationPayload,
  SenderKeySession,
  DoubleRatchetSession,
  computeX3dhAlice,
  encodeBytes,
} from "@emberchamber/protocol";
import type { EncryptedConversationPayload, SenderKeyState, ReplyMetaPayload } from "@emberchamber/protocol";
import nacl from "tweetnacl";
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
  loadGroupSenderKey,
  saveGroupSenderKey,
  loadDoubleRatchetSession,
  saveDoubleRatchetSession,
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
  replyingToMessage: GroupThreadMessage | null;
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
  setReplyingToMessage: (message: GroupThreadMessage | null) => void;
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
  replyingToMessage,
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
  setReplyingToMessage,
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

          const replyTo: ReplyMetaPayload | null = replyingToMessage
            ? {
                clientMessageId: replyingToMessage.id.includes(":")
                  ? replyingToMessage.id.split(":")[1]
                  : replyingToMessage.id,
                text: replyingToMessage.text || null,
                senderDisplayName: replyingToMessage.senderDisplayName,
              }
            : null;

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
            messageType: "message",
            text: trimmedText || undefined,
            replyTo,
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

          if (!db) {
            throw new Error("Local database is not open.");
          }

          // Retrieve or generate our own Sender Key for the group.
          const savedKeyJson = await loadGroupSenderKey(db, selectedGroup.id, session.deviceId);
          let senderKeySession: SenderKeySession;
          let mustDistribute = false;
          let targetRecipientDevicesToDistribute: DeviceKeyBundle[] = [];

          if (savedKeyJson) {
            const state = JSON.parse(savedKeyJson) as SenderKeyState;
            senderKeySession = new SenderKeySession(state);

            // Check if membership has changed (Forward Secrecy check)
            const previouslyShared = state.sharedWithDeviceIds || [];
            const currentRecipientDeviceIds = recipientDevices.map((d) => d.deviceId);
            const isAnyRemoved = previouslyShared.some((id) => !currentRecipientDeviceIds.includes(id));

            if (isAnyRemoved) {
              // Rotate key: generate new session
              senderKeySession = SenderKeySession.create(selectedGroup.id, session.deviceId);
              mustDistribute = true;
              targetRecipientDevicesToDistribute = recipientDevices;
            } else {
              // Just check if we need to distribute to new devices
              const missingDevices = recipientDevices.filter((d) => !previouslyShared.includes(d.deviceId));
              if (missingDevices.length > 0) {
                mustDistribute = true;
                targetRecipientDevicesToDistribute = missingDevices;
              }
            }
          } else {
            // First time sending in this group
            senderKeySession = SenderKeySession.create(selectedGroup.id, session.deviceId);
            mustDistribute = true;
            targetRecipientDevicesToDistribute = recipientDevices;
          }

          if (mustDistribute && targetRecipientDevicesToDistribute.length > 0) {
            const envelopesToDistribute: Array<{
              recipientDeviceId: string;
              ciphertext: string;
            }> = [];

            for (const bundle of targetRecipientDevicesToDistribute) {
              const savedSessionJson = await loadDoubleRatchetSession(db, bundle.deviceId);
              let drSession: DoubleRatchetSession;
              let ephemeralKeyB64: string | undefined = undefined;

              if (savedSessionJson) {
                const state = JSON.parse(savedSessionJson);
                drSession = new DoubleRatchetSession(state);
              } else {
                const ephemeralKeyPair = nacl.box.keyPair();
                ephemeralKeyB64 = encodeBytes(ephemeralKeyPair.publicKey);

                const sharedMasterKey = computeX3dhAlice({
                  ourIdentityPrivateB64: localBundle.privateKeyB64,
                  ourEphemeralPrivateB64: encodeBytes(ephemeralKeyPair.secretKey),
                  peerIdentityPublicB64: bundle.bundle.identityKeyB64,
                  peerSignedPrekeyPublicB64: bundle.bundle.signedPrekeyB64,
                  peerOneTimePrekeyPublicB64: bundle.bundle.oneTimePrekeysB64?.[0] || null,
                });

                drSession = DoubleRatchetSession.initAlice({
                  peerDeviceId: bundle.deviceId,
                  sharedMasterKey,
                  peerDhPublicKeyB64: bundle.bundle.signedPrekeyB64,
                });
              }

              const distMessage = senderKeySession.makeDistributionMessage();
              const distPayloadBytes = new TextEncoder().encode(JSON.stringify(distMessage));
              const encryptedDr = drSession.encrypt(distPayloadBytes);

              await saveDoubleRatchetSession(db, bundle.deviceId, JSON.stringify(drSession.getState()));

              const drEnvelope = {
                version: 2,
                ephemeralKeyB64,
                ciphertextB64: encodeBytes(encryptedDr.ciphertext),
                dhPubB64: encodeBytes(encryptedDr.dhPub),
                n: encryptedDr.n,
                pn: encryptedDr.pn,
              };

              envelopesToDistribute.push({
                recipientDeviceId: bundle.deviceId,
                ciphertext: encodeBytes(new TextEncoder().encode(JSON.stringify(drEnvelope))),
              });
            }

            // Send distribution envelopes via batch
            await relayFetch<{ acceptedEnvelopeIds: string[] }>(
              session,
              "/v1/messages/batch",
              {
                method: "POST",
                body: JSON.stringify({
                  conversationId: selectedGroup.id,
                  epoch: selectedGroup.epoch,
                  envelopes: envelopesToDistribute.map((item) => ({
                    recipientDeviceId: item.recipientDeviceId,
                    ciphertext: item.ciphertext,
                    clientMessageId: makeOpaqueToken(),
                    attachmentIds: [],
                  })),
                }),
              },
            );

            // Update sharedWithDeviceIds list
            const currentShared = senderKeySession.getState().sharedWithDeviceIds || [];
            const newShared = Array.from(new Set([
              ...currentShared,
              ...targetRecipientDevicesToDistribute.map((d) => d.deviceId),
            ]));
            senderKeySession.getState().sharedWithDeviceIds = newShared;
          }

          // Encrypt conversation payload using our Sender Key
          const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
          const encryptedGroup = senderKeySession.encrypt(payloadBytes);

          // Save the updated Sender Key state
          await saveGroupSenderKey(
            db,
            selectedGroup.id,
            session.deviceId,
            JSON.stringify(senderKeySession.getState()),
          );

          // Build Version 3 envelope
          const groupEnvelope = {
            version: 3,
            groupId: selectedGroup.id,
            senderDeviceId: session.deviceId,
            iteration: encryptedGroup.iteration,
            ciphertextB64: encodeBytes(encryptedGroup.ciphertext),
            signatureB64: encodeBytes(encryptedGroup.signature),
          };

          const outerCiphertext = encodeBytes(new TextEncoder().encode(JSON.stringify(groupEnvelope)));

          // Send the group message ciphertext via the new POST /v1/messages/group endpoint
          await relayFetch<{ acceptedEnvelopeIds: string[] }>(
            session,
            "/v1/messages/group",
            {
              method: "POST",
              body: JSON.stringify({
                conversationId: selectedGroup.id,
                epoch: selectedGroup.epoch,
                ciphertext: outerCiphertext,
                clientMessageId,
                attachmentIds,
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
            replyTo: replyingToMessage
              ? {
                  messageId: replyingToMessage.id,
                  text: replyingToMessage.text || null,
                  senderDisplayName: replyingToMessage.senderDisplayName,
                }
              : null,
          };
        } else {
          let attachmentId: string | undefined;

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
                  mimeType: pendingAttachment.mimeType,
                  encryptionMode: "device_encrypted",
                  ciphertextByteLength: encrypted.ciphertext.byteLength,
                  ciphertextSha256B64: encrypted.ciphertextSha256B64,
                  plaintextByteLength: encrypted.plaintext.byteLength,
                  plaintextSha256B64: encrypted.plaintextSha256B64,
                  fileKeyB64: encrypted.fileKeyB64,
                  fileIvB64: encrypted.fileIvB64,
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
        setReplyingToMessage(null);

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
      replyingToMessage,
      selectedGroup,
      session,
      setEditingMessageId,
      setMessageDraft,
      setPendingAttachment,
      setReplyingToMessage,
      setSessionMessage,
      setThreadMessages,
      setVaultCount,
      threadMessages,
    ],
  );

  const sendEncryptedControlMessage = useCallback(
    async (args: {
      messageType: "reaction" | "delete";
      targetClientMessageId: string;
      emoji?: string;
      deletedAt?: string;
    }) => {
      if (!session || !selectedGroup || !db) {
        throw new Error("Missing session, group, or database for control message.");
      }

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
        return;
      }

      const clientMessageId = makeOpaqueToken();
      const senderDisplayName = profile?.displayName ?? deviceLabel;
      const createdAt = new Date().toISOString();

      const payload: EncryptedConversationPayload = {
        version: 1,
        kind: "ember_conversation_v1",
        conversationId: selectedGroup.id,
        conversationKind: "group",
        historyMode: "device_encrypted",
        senderDisplayName,
        messageType: args.messageType,
        targetClientMessageId: args.targetClientMessageId,
        emoji: args.emoji,
        reactionAction: args.messageType === "reaction" ? "toggle" : undefined,
        deletedAt: args.deletedAt,
        createdAt,
        clientMessageId,
      };

      const savedKeyJson = await loadGroupSenderKey(db, selectedGroup.id, session.deviceId);
      let senderKeySession: SenderKeySession;
      let mustDistribute = false;
      let targetRecipientDevicesToDistribute: DeviceKeyBundle[] = [];

      if (savedKeyJson) {
        const state = JSON.parse(savedKeyJson) as SenderKeyState;
        senderKeySession = new SenderKeySession(state);

        const previouslyShared = state.sharedWithDeviceIds || [];
        const currentRecipientDeviceIds = recipientDevices.map((d) => d.deviceId);
        const isAnyRemoved = previouslyShared.some((id) => !currentRecipientDeviceIds.includes(id));

        if (isAnyRemoved) {
          senderKeySession = SenderKeySession.create(selectedGroup.id, session.deviceId);
          mustDistribute = true;
          targetRecipientDevicesToDistribute = recipientDevices;
        } else {
          const missingDevices = recipientDevices.filter((d) => !previouslyShared.includes(d.deviceId));
          if (missingDevices.length > 0) {
            mustDistribute = true;
            targetRecipientDevicesToDistribute = missingDevices;
          }
        }
      } else {
        senderKeySession = SenderKeySession.create(selectedGroup.id, session.deviceId);
        mustDistribute = true;
        targetRecipientDevicesToDistribute = recipientDevices;
      }

      if (mustDistribute && targetRecipientDevicesToDistribute.length > 0) {
        const envelopesToDistribute: Array<{
          recipientDeviceId: string;
          ciphertext: string;
        }> = [];

        for (const bundle of targetRecipientDevicesToDistribute) {
          const savedSessionJson = await loadDoubleRatchetSession(db, bundle.deviceId);
          let drSession: DoubleRatchetSession;
          let ephemeralKeyB64: string | undefined = undefined;

          if (savedSessionJson) {
            const state = JSON.parse(savedSessionJson);
            drSession = new DoubleRatchetSession(state);
          } else {
            const ephemeralKeyPair = nacl.box.keyPair();
            ephemeralKeyB64 = encodeBytes(ephemeralKeyPair.publicKey);

            const sharedMasterKey = computeX3dhAlice({
              ourIdentityPrivateB64: localBundle.privateKeyB64,
              ourEphemeralPrivateB64: encodeBytes(ephemeralKeyPair.secretKey),
              peerIdentityPublicB64: bundle.bundle.identityKeyB64,
              peerSignedPrekeyPublicB64: bundle.bundle.signedPrekeyB64,
              peerOneTimePrekeyPublicB64: bundle.bundle.oneTimePrekeysB64?.[0] || null,
            });

            drSession = DoubleRatchetSession.initAlice({
              peerDeviceId: bundle.deviceId,
              sharedMasterKey,
              peerDhPublicKeyB64: bundle.bundle.signedPrekeyB64,
            });
          }

          const distMessage = senderKeySession.makeDistributionMessage();
          const distPayloadBytes = new TextEncoder().encode(JSON.stringify(distMessage));
          const encryptedDr = drSession.encrypt(distPayloadBytes);

          await saveDoubleRatchetSession(db, bundle.deviceId, JSON.stringify(drSession.getState()));

          const drEnvelope = {
            version: 2,
            ephemeralKeyB64,
            ciphertextB64: encodeBytes(encryptedDr.ciphertext),
            dhPubB64: encodeBytes(encryptedDr.dhPub),
            n: encryptedDr.n,
            pn: encryptedDr.pn,
          };

          envelopesToDistribute.push({
            recipientDeviceId: bundle.deviceId,
            ciphertext: encodeBytes(new TextEncoder().encode(JSON.stringify(drEnvelope))),
          });
        }

        await relayFetch<{ acceptedEnvelopeIds: string[] }>(
          session,
          "/v1/messages/batch",
          {
            method: "POST",
            body: JSON.stringify({
              conversationId: selectedGroup.id,
              epoch: selectedGroup.epoch,
              envelopes: envelopesToDistribute.map((item) => ({
                recipientDeviceId: item.recipientDeviceId,
                ciphertext: item.ciphertext,
                clientMessageId: makeOpaqueToken(),
                attachmentIds: [],
              })),
            }),
          },
        );

        const currentShared = senderKeySession.getState().sharedWithDeviceIds || [];
        const newShared = Array.from(new Set([
          ...currentShared,
          ...targetRecipientDevicesToDistribute.map((d) => d.deviceId),
        ]));
        senderKeySession.getState().sharedWithDeviceIds = newShared;
      }

      const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
      const encryptedGroup = senderKeySession.encrypt(payloadBytes);

      await saveGroupSenderKey(
        db,
        selectedGroup.id,
        session.deviceId,
        JSON.stringify(senderKeySession.getState()),
      );

      const groupEnvelope = {
        version: 3,
        groupId: selectedGroup.id,
        senderDeviceId: session.deviceId,
        iteration: encryptedGroup.iteration,
        ciphertextB64: encodeBytes(encryptedGroup.ciphertext),
        signatureB64: encodeBytes(encryptedGroup.signature),
      };

      const outerCiphertext = encodeBytes(new TextEncoder().encode(JSON.stringify(groupEnvelope)));

      await relayFetch<{ acceptedEnvelopeIds: string[] }>(
        session,
        "/v1/messages/group",
        {
          method: "POST",
          body: JSON.stringify({
            conversationId: selectedGroup.id,
            epoch: selectedGroup.epoch,
            ciphertext: outerCiphertext,
            clientMessageId,
            attachmentIds: [],
          }),
        },
      );
    },
    [
      db,
      deviceLabel,
      listDeviceBundlesForAccount,
      loadStoredBundleOrThrow,
      profile,
      relayFetch,
      selectedGroup,
      session,
    ],
  );

  return { sendMessage, sendEncryptedControlMessage, isSendingMessage };
}
