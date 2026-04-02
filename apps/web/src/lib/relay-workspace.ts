"use client";

import type {
  AttachmentEncryptionMode,
  ContentClass,
  ConversationDetail,
  ConversationSummary,
  PrekeyBundle,
  ProtectionProfile,
  RetentionMode,
} from "@emberchamber/protocol";
import {
  readRelaySession,
  relayAttachmentApi,
  relayConversationApi,
  relayDeviceApi,
  relayMailboxApi,
  uploadAttachment,
} from "@/lib/relay";

const WORKSPACE_STORAGE_KEY = "emberchamber.relay.workspace.v1";

type WorkspaceState = {
  version: 1;
  registeredDeviceId?: string;
  bundle?: PrekeyBundle;
  mailboxCursor?: string;
  knownEnvelopeIds: string[];
  messagesByConversation: Record<string, StoredDmMessage[]>;
};

type WorkspaceEnvelopeAttachment = {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  contentClass: ContentClass;
  retentionMode: RetentionMode;
  protectionProfile: ProtectionProfile;
  previewBlurHash?: string | null;
  encryptionMode: AttachmentEncryptionMode;
  downloadUrl: string;
  fileKeyB64?: string;
  fileIvB64?: string;
};

type WorkspaceEnvelopePayload = {
  version: 1;
  kind: "web_dm_v1";
  senderDisplayName: string;
  text?: string | null;
  attachment?: WorkspaceEnvelopeAttachment | null;
  createdAt: string;
  clientMessageId: string;
};

export type StoredDmMessage = {
  id: string;
  conversationId: string;
  senderAccountId: string;
  senderDisplayName: string;
  text?: string | null;
  attachment?: WorkspaceEnvelopeAttachment | null;
  createdAt: string;
  clientMessageId: string;
  envelopeId?: string;
  status: "pending" | "sent" | "received" | "failed";
};

function defaultWorkspaceState(): WorkspaceState {
  return {
    version: 1,
    knownEnvelopeIds: [],
    messagesByConversation: {},
  };
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function decodeBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function encodeJson(value: unknown): string {
  return btoa(JSON.stringify(value));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(atob(value)) as T;
}

async function sha256B64(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return encodeBytes(new Uint8Array(digest));
}

function randomOpaqueToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBytes(bytes);
}

function readWorkspaceState(): WorkspaceState {
  if (typeof window === "undefined") {
    return defaultWorkspaceState();
  }

  const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (!raw) {
    return defaultWorkspaceState();
  }

  try {
    return JSON.parse(raw) as WorkspaceState;
  } catch {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return defaultWorkspaceState();
  }
}

function writeWorkspaceState(state: WorkspaceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

function upsertStoredMessage(state: WorkspaceState, message: StoredDmMessage) {
  const existing = state.messagesByConversation[message.conversationId] ?? [];
  const next = existing.filter(
    (entry) =>
      entry.id !== message.id &&
      entry.envelopeId !== message.envelopeId &&
      entry.clientMessageId !== message.clientMessageId,
  );
  next.push(message);
  next.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  state.messagesByConversation[message.conversationId] = next;
}

function keepRecentEnvelopeIds(ids: string[]): string[] {
  return ids.slice(Math.max(0, ids.length - 1000));
}

function contentClassForMimeType(mimeType: string): ContentClass {
  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  if (!mimeType.startsWith("image/")) {
    return "file";
  }

  return "image";
}

async function ensureRelayDeviceBundle() {
  const session = readRelaySession();
  if (!session) {
    throw new Error("Missing relay session");
  }

  const state = readWorkspaceState();
  if (state.registeredDeviceId === session.deviceId && state.bundle) {
    return state.bundle;
  }

  const bundle: PrekeyBundle = {
    identityKeyB64: randomOpaqueToken(),
    signedPrekeyB64: randomOpaqueToken(),
    signedPrekeySignatureB64: randomOpaqueToken(),
    oneTimePrekeysB64: Array.from({ length: 8 }, () => randomOpaqueToken(24)),
  };

  await relayDeviceApi.registerBundle(bundle);
  writeWorkspaceState({
    ...state,
    registeredDeviceId: session.deviceId,
    bundle,
  });

  return bundle;
}

export function listStoredDmMessages(conversationId: string): StoredDmMessage[] {
  return readWorkspaceState().messagesByConversation[conversationId] ?? [];
}

export function getConversationPreview(conversationId: string) {
  const messages = listStoredDmMessages(conversationId);
  return messages[messages.length - 1] ?? null;
}

export async function syncRelayMailbox() {
  const session = readRelaySession();
  if (!session) {
    return { receivedConversationIds: [] as string[] };
  }

  await ensureRelayDeviceBundle();

  const state = readWorkspaceState();
  const sync = await relayMailboxApi.sync(state.mailboxCursor);
  if (sync.envelopes.length === 0) {
    if (sync.cursor.lastSeenEnvelopeId && sync.cursor.lastSeenEnvelopeId !== state.mailboxCursor) {
      writeWorkspaceState({
        ...state,
        mailboxCursor: sync.cursor.lastSeenEnvelopeId,
      });
    }

    return { receivedConversationIds: [] as string[] };
  }

  const receivedConversationIds = new Set<string>();
  const ackEnvelopeIds: string[] = [];
  const knownEnvelopeIds = new Set(state.knownEnvelopeIds);

  for (const envelope of sync.envelopes) {
    ackEnvelopeIds.push(envelope.envelopeId);

    if (knownEnvelopeIds.has(envelope.envelopeId)) {
      continue;
    }

    let payload: WorkspaceEnvelopePayload | null = null;
    try {
      payload = decodeJson<WorkspaceEnvelopePayload>(envelope.ciphertext);
    } catch {
      continue;
    }

    if (!payload || payload.kind !== "web_dm_v1") {
      continue;
    }

    knownEnvelopeIds.add(envelope.envelopeId);
    receivedConversationIds.add(envelope.conversationId);
    upsertStoredMessage(state, {
      id: `${envelope.envelopeId}:${payload.clientMessageId}`,
      envelopeId: envelope.envelopeId,
      conversationId: envelope.conversationId,
      senderAccountId: envelope.senderAccountId,
      senderDisplayName: payload.senderDisplayName,
      text: payload.text,
      attachment: payload.attachment ?? null,
      createdAt: payload.createdAt,
      clientMessageId: payload.clientMessageId,
      status: "received",
    });
  }

  state.mailboxCursor = sync.cursor.lastSeenEnvelopeId ?? state.mailboxCursor;
  state.knownEnvelopeIds = keepRecentEnvelopeIds(Array.from(knownEnvelopeIds));
  writeWorkspaceState(state);

  await relayMailboxApi.ack({ envelopeIds: ackEnvelopeIds });

  return {
    receivedConversationIds: Array.from(receivedConversationIds),
  };
}

async function encryptAttachment(file: File) {
  const plaintext = await file.arrayBuffer();
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const rawKey = await crypto.subtle.exportKey("raw", key);

  return {
    plaintext,
    ciphertext,
    plaintextSha256B64: await sha256B64(plaintext),
    ciphertextSha256B64: await sha256B64(ciphertext),
    fileKeyB64: encodeBytes(new Uint8Array(rawKey)),
    fileIvB64: encodeBytes(iv),
  };
}

export async function sendDirectMessage(input: {
  conversation: ConversationDetail | ConversationSummary;
  senderDisplayName: string;
  text?: string;
  file?: File | null;
}) {
  const session = readRelaySession();
  if (!session) {
    throw new Error("Missing relay session");
  }

  await ensureRelayDeviceBundle();

  const members = "members" in input.conversation
    ? input.conversation.members
    : (await relayConversationApi.get(input.conversation.id)).members;
  const recipientAccounts = members
    .filter((member) => member.accountId !== session.accountId)
    .map((member) => member.accountId);

  if (recipientAccounts.length === 0) {
    throw new Error("A DM needs another member before it can send.");
  }

  const bundleLists = await Promise.all(
    Array.from(new Set(input.conversation.memberAccountIds)).map(async (accountId) => ({
      accountId,
      bundles: await relayDeviceApi.listBundles(accountId),
    })),
  );
  const recipientDevices = bundleLists
    .flatMap((entry) => entry.bundles)
    .filter((bundle) => bundle.deviceId !== session.deviceId);

  if (recipientDevices.length === 0) {
    throw new Error("No recipient devices are registered for this conversation yet.");
  }

  const trimmedText = input.text?.trim();
  let attachment: WorkspaceEnvelopeAttachment | null = null;
  let attachmentIds: string[] = [];

  if (input.file) {
    const encrypted = await encryptAttachment(input.file);
    const ticket = await relayAttachmentApi.createTicket({
      fileName: input.file.name,
      mimeType: "application/octet-stream",
      encryptionMode: "device_encrypted",
      ciphertextByteLength: encrypted.ciphertext.byteLength,
      ciphertextSha256B64: encrypted.ciphertextSha256B64,
      plaintextByteLength: encrypted.plaintext.byteLength,
      plaintextSha256B64: encrypted.plaintextSha256B64,
      conversationId: input.conversation.id,
      conversationEpoch: input.conversation.epoch,
      contentClass: contentClassForMimeType(input.file.type),
      retentionMode: "private_vault",
      protectionProfile: "standard",
    });

    await uploadAttachment(ticket.uploadUrl, encrypted.ciphertext, "application/octet-stream");
    attachment = {
      attachmentId: ticket.attachmentId,
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      byteLength: input.file.size,
      contentClass: contentClassForMimeType(input.file.type),
      retentionMode: ticket.retentionMode,
      protectionProfile: ticket.protectionProfile,
      previewBlurHash: ticket.previewBlurHash ?? null,
      encryptionMode: ticket.encryptionMode,
      downloadUrl: ticket.downloadUrl,
      fileKeyB64: encrypted.fileKeyB64,
      fileIvB64: encrypted.fileIvB64,
    };
    attachmentIds = [ticket.attachmentId];
  }

  if (!trimmedText && !attachment) {
    throw new Error("A DM needs text or an attachment.");
  }

  const createdAt = new Date().toISOString();
  const clientMessageId = crypto.randomUUID();
  const payload: WorkspaceEnvelopePayload = {
    version: 1,
    kind: "web_dm_v1",
    senderDisplayName: input.senderDisplayName,
    text: trimmedText,
    attachment,
    createdAt,
    clientMessageId,
  };

  await relayMailboxApi.sendBatch({
    conversationId: input.conversation.id,
    epoch: input.conversation.epoch,
    envelopes: recipientDevices.map((bundle) => ({
      recipientDeviceId: bundle.deviceId,
      ciphertext: encodeJson(payload),
      clientMessageId,
      attachmentIds,
    })),
  });

  const state = readWorkspaceState();
  upsertStoredMessage(state, {
    id: clientMessageId,
    conversationId: input.conversation.id,
    senderAccountId: session.accountId,
    senderDisplayName: input.senderDisplayName,
    text: trimmedText,
    attachment,
    createdAt,
    clientMessageId,
    status: "sent",
  });
  writeWorkspaceState(state);
}

export async function readDmAttachmentBlob(attachment: WorkspaceEnvelopeAttachment) {
  if (attachment.encryptionMode !== "device_encrypted" || !attachment.fileKeyB64 || !attachment.fileIvB64) {
    const access = await relayAttachmentApi.refreshDownloadUrl(attachment.attachmentId);
    const response = await fetch(access.downloadUrl);
    if (!response.ok) {
      throw new Error("Unable to fetch attachment bytes.");
    }

    const buffer = await response.arrayBuffer();
    return new Blob([buffer], { type: attachment.mimeType });
  }

  const access = await relayAttachmentApi.refreshDownloadUrl(attachment.attachmentId);
  const response = await fetch(access.downloadUrl);
  if (!response.ok) {
    throw new Error("Unable to fetch encrypted attachment bytes.");
  }

  const ciphertext = await response.arrayBuffer();
  const rawKey = decodeBytes(attachment.fileKeyB64);
  const iv = decodeBytes(attachment.fileIvB64);
  const rawKeyBuffer = toArrayBuffer(rawKey);
  const ivBuffer = toArrayBuffer(iv);
  const key = await crypto.subtle.importKey("raw", rawKeyBuffer, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
    key,
    ciphertext,
  );
  return new Blob([plaintext], { type: attachment.mimeType });
}

export async function ensureWorkspaceReady() {
  await ensureRelayDeviceBundle();
  await syncRelayMailbox();
}
