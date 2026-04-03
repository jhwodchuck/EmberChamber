"use client";

import type {
  AttachmentEncryptionMode,
  CipherEnvelope,
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
const WORKSPACE_DB_NAME = "emberchamber-relay-workspace";
const WORKSPACE_DB_VERSION = 1;
const WORKSPACE_MESSAGE_STORE = "dm_messages";
const WORKSPACE_FALLBACK_MESSAGE_PREFIX = "emberchamber.relay.workspace.dm.";
const MAX_STORED_DM_MESSAGES = 2000;

type WorkspaceState = {
  version: 2;
  registeredDeviceId?: string;
  bundle?: PrekeyBundle;
  mailboxCursor?: string;
  knownEnvelopeIds: string[];
};

type LegacyWorkspaceState = {
  version?: number;
  registeredDeviceId?: string;
  bundle?: PrekeyBundle;
  mailboxCursor?: string;
  knownEnvelopeIds?: string[];
  messagesByConversation?: Record<string, StoredDmMessage[]>;
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

const workspaceMessageCache = new Map<string, StoredDmMessage[]>();
let workspaceDbPromise: Promise<IDBDatabase | null> | null = null;
let legacyWorkspaceMigrationPromise: Promise<void> | null = null;

function defaultWorkspaceState(): WorkspaceState {
  return {
    version: 2,
    knownEnvelopeIds: [],
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

function fallbackMessageStorageKey(conversationId: string) {
  return `${WORKSPACE_FALLBACK_MESSAGE_PREFIX}${conversationId}`;
}

function parseWorkspaceState(raw: string | null): LegacyWorkspaceState | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LegacyWorkspaceState;
  } catch {
    return null;
  }
}

function readWorkspaceState(): WorkspaceState {
  if (typeof window === "undefined") {
    return defaultWorkspaceState();
  }

  const parsed = parseWorkspaceState(window.localStorage.getItem(WORKSPACE_STORAGE_KEY));
  if (!parsed) {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return defaultWorkspaceState();
  }

  return {
    version: 2,
    registeredDeviceId: parsed.registeredDeviceId,
    bundle: parsed.bundle,
    mailboxCursor: parsed.mailboxCursor,
    knownEnvelopeIds: parsed.knownEnvelopeIds ?? [],
  };
}

function writeWorkspaceState(state: WorkspaceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

function trimStoredMessages(messages: StoredDmMessage[]) {
  return messages
    .slice()
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .slice(-MAX_STORED_DM_MESSAGES);
}

function upsertMessageList(existing: StoredDmMessage[], message: StoredDmMessage) {
  const next = existing.filter(
    (entry) =>
      entry.id !== message.id &&
      entry.envelopeId !== message.envelopeId &&
      entry.clientMessageId !== message.clientMessageId,
  );
  next.push(message);
  return trimStoredMessages(next);
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

async function openWorkspaceDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return null;
  }

  if (!workspaceDbPromise) {
    workspaceDbPromise = new Promise((resolve) => {
      const request = window.indexedDB.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORKSPACE_MESSAGE_STORE)) {
          db.createObjectStore(WORKSPACE_MESSAGE_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  return workspaceDbPromise;
}

async function readConversationMessagesFromDb(conversationId: string): Promise<StoredDmMessage[]> {
  const db = await openWorkspaceDb();
  if (!db) {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(fallbackMessageStorageKey(conversationId));
    if (!raw) {
      return [];
    }

    try {
      return trimStoredMessages(JSON.parse(raw) as StoredDmMessage[]);
    } catch {
      window.localStorage.removeItem(fallbackMessageStorageKey(conversationId));
      return [];
    }
  }

  return new Promise<StoredDmMessage[]>((resolve) => {
    const transaction = db.transaction(WORKSPACE_MESSAGE_STORE, "readonly");
    const request = transaction.objectStore(WORKSPACE_MESSAGE_STORE).get(conversationId);
    request.onsuccess = () => {
      const stored = request.result;
      resolve(Array.isArray(stored) ? trimStoredMessages(stored as StoredDmMessage[]) : []);
    };
    request.onerror = () => resolve([]);
  });
}

async function persistConversationMessages(conversationId: string, messages: StoredDmMessage[]) {
  const trimmed = trimStoredMessages(messages);
  workspaceMessageCache.set(conversationId, trimmed);
  const db = await openWorkspaceDb();

  if (!db) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(fallbackMessageStorageKey(conversationId), JSON.stringify(trimmed));
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(WORKSPACE_MESSAGE_STORE, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.objectStore(WORKSPACE_MESSAGE_STORE).put(trimmed, conversationId);
  });
}

async function loadConversationMessages(conversationId: string): Promise<StoredDmMessage[]> {
  if (workspaceMessageCache.has(conversationId)) {
    return workspaceMessageCache.get(conversationId) ?? [];
  }

  const messages = await readConversationMessagesFromDb(conversationId);
  workspaceMessageCache.set(conversationId, messages);
  return messages;
}

async function migrateLegacyWorkspaceState() {
  if (legacyWorkspaceMigrationPromise) {
    return legacyWorkspaceMigrationPromise;
  }

  legacyWorkspaceMigrationPromise = (async () => {
    if (typeof window === "undefined") {
      return;
    }

    const parsed = parseWorkspaceState(window.localStorage.getItem(WORKSPACE_STORAGE_KEY));
    if (!parsed?.messagesByConversation || Object.keys(parsed.messagesByConversation).length === 0) {
      return;
    }

    await Promise.all(
      Object.entries(parsed.messagesByConversation).map(([conversationId, messages]) =>
        persistConversationMessages(conversationId, messages),
      ),
    );

    writeWorkspaceState({
      version: 2,
      registeredDeviceId: parsed.registeredDeviceId,
      bundle: parsed.bundle,
      mailboxCursor: parsed.mailboxCursor,
      knownEnvelopeIds: parsed.knownEnvelopeIds ?? [],
    });
  })();

  return legacyWorkspaceMigrationPromise;
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

export async function listStoredDmMessages(conversationId: string): Promise<StoredDmMessage[]> {
  await migrateLegacyWorkspaceState();
  return loadConversationMessages(conversationId);
}

export async function getConversationPreview(conversationId: string) {
  const messages = await listStoredDmMessages(conversationId);
  return messages[messages.length - 1] ?? null;
}

export async function getConversationPreviews(conversationIds: string[]) {
  const entries = await Promise.all(
    conversationIds.map(async (conversationId) => [conversationId, await getConversationPreview(conversationId)] as const),
  );

  return Object.fromEntries(entries) as Record<string, StoredDmMessage | null>;
}

export async function ingestRelayEnvelopes(
  envelopes: CipherEnvelope[],
  options: { cursor?: string; acknowledge?: boolean } = {},
) {
  await migrateLegacyWorkspaceState();
  const receivedConversationIds = new Set<string>();
  const ackEnvelopeIds = envelopes.map((envelope) => envelope.envelopeId);
  const updatedMessages = new Map<string, StoredDmMessage[]>();
  const state = readWorkspaceState();
  const knownEnvelopeIds = new Set(state.knownEnvelopeIds);

  for (const envelope of envelopes) {
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
    const existingMessages =
      updatedMessages.get(envelope.conversationId) ??
      (await loadConversationMessages(envelope.conversationId));
    updatedMessages.set(
      envelope.conversationId,
      upsertMessageList(existingMessages, {
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
      }),
    );
  }

  await Promise.all(
    Array.from(updatedMessages.entries()).map(([conversationId, messages]) =>
      persistConversationMessages(conversationId, messages),
    ),
  );

  state.mailboxCursor = options.cursor ?? envelopes[envelopes.length - 1]?.envelopeId ?? state.mailboxCursor;
  state.knownEnvelopeIds = keepRecentEnvelopeIds(Array.from(knownEnvelopeIds));
  writeWorkspaceState(state);

  if (options.acknowledge !== false && ackEnvelopeIds.length) {
    await relayMailboxApi.ack({ envelopeIds: ackEnvelopeIds });
  }

  return {
    receivedConversationIds: Array.from(receivedConversationIds),
  };
}

export async function syncRelayMailbox() {
  const session = readRelaySession();
  if (!session) {
    return { receivedConversationIds: [] as string[] };
  }

  await ensureRelayDeviceBundle();
  await migrateLegacyWorkspaceState();

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

  return ingestRelayEnvelopes(sync.envelopes, {
    cursor: sync.cursor.lastSeenEnvelopeId,
  });
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

  await migrateLegacyWorkspaceState();
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

  const existingMessages = await loadConversationMessages(input.conversation.id);
  await persistConversationMessages(
    input.conversation.id,
    upsertMessageList(existingMessages, {
      id: clientMessageId,
      conversationId: input.conversation.id,
      senderAccountId: session.accountId,
      senderDisplayName: input.senderDisplayName,
      text: trimmedText,
      attachment,
      createdAt,
      clientMessageId,
      status: "sent",
    }),
  );
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
  await migrateLegacyWorkspaceState();
  await ensureRelayDeviceBundle();
  await syncRelayMailbox();
}
