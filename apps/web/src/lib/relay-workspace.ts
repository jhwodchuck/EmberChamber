"use client";

import type {
  AttachmentEncryptionMode,
  CipherEnvelope,
  ContentClass,
  ConversationDetail,
  ConversationSummary,
  DeviceKeyBundle,
  EncryptedConversationAttachment,
  EncryptedConversationPayload,
  ProtectionProfile,
  RetentionMode,
  StoredDeviceBundle,
} from "@emberchamber/protocol";
import {
  decodeBytes,
  createStoredDeviceBundle,
  decryptAttachmentBytes,
  decryptConversationPayload,
  encryptAttachmentBytes,
  encryptConversationPayload,
  isStoredDeviceBundle,
  toPublicPrekeyBundle,
  toArrayBuffer,
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
  bundle?: StoredDeviceBundle;
  mailboxCursor?: string;
  knownEnvelopeIds: string[];
};

type LegacyWorkspaceState = {
  version?: number;
  registeredDeviceId?: string;
  bundle?: StoredDeviceBundle;
  mailboxCursor?: string;
  knownEnvelopeIds?: string[];
  messagesByConversation?: Record<string, StoredDmMessage[]>;
};

type WorkspaceEnvelopeAttachment = EncryptedConversationAttachment & {
  downloadUrl?: string;
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

type RelayReadableAttachment = {
  attachmentId?: string;
  id?: string;
  fileName: string;
  mimeType: string;
  byteLength?: number;
  contentClass: ContentClass;
  retentionMode: RetentionMode;
  protectionProfile: ProtectionProfile;
  previewBlurHash?: string | null;
  encryptionMode?: AttachmentEncryptionMode;
  downloadUrl?: string;
  fileKeyB64?: string | null;
  fileIvB64?: string | null;
};

const workspaceMessageCache = new Map<string, StoredDmMessage[]>();
const deviceBundleCache = new Map<string, Promise<DeviceKeyBundle[]>>();
let workspaceDbPromise: Promise<IDBDatabase | null> | null = null;
let legacyWorkspaceMigrationPromise: Promise<void> | null = null;

function defaultWorkspaceState(): WorkspaceState {
  return {
    version: 2,
    knownEnvelopeIds: [],
  };
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

  const parsed = parseWorkspaceState(
    window.localStorage.getItem(WORKSPACE_STORAGE_KEY),
  );
  if (!parsed) {
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return defaultWorkspaceState();
  }

  return {
    version: 2,
    registeredDeviceId: parsed.registeredDeviceId,
    bundle: isStoredDeviceBundle(parsed.bundle) ? parsed.bundle : undefined,
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
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    )
    .slice(-MAX_STORED_DM_MESSAGES);
}

function upsertMessageList(
  existing: StoredDmMessage[],
  message: StoredDmMessage,
) {
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
      const request = window.indexedDB.open(
        WORKSPACE_DB_NAME,
        WORKSPACE_DB_VERSION,
      );

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

async function readConversationMessagesFromDb(
  conversationId: string,
): Promise<StoredDmMessage[]> {
  const db = await openWorkspaceDb();
  if (!db) {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(
      fallbackMessageStorageKey(conversationId),
    );
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
    const request = transaction
      .objectStore(WORKSPACE_MESSAGE_STORE)
      .get(conversationId);
    request.onsuccess = () => {
      const stored = request.result;
      resolve(
        Array.isArray(stored)
          ? trimStoredMessages(stored as StoredDmMessage[])
          : [],
      );
    };
    request.onerror = () => resolve([]);
  });
}

async function persistConversationMessages(
  conversationId: string,
  messages: StoredDmMessage[],
) {
  const trimmed = trimStoredMessages(messages);
  workspaceMessageCache.set(conversationId, trimmed);
  const db = await openWorkspaceDb();

  if (!db) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        fallbackMessageStorageKey(conversationId),
        JSON.stringify(trimmed),
      );
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(WORKSPACE_MESSAGE_STORE, "readwrite");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction
      .objectStore(WORKSPACE_MESSAGE_STORE)
      .put(trimmed, conversationId);
  });
}

async function loadConversationMessages(
  conversationId: string,
): Promise<StoredDmMessage[]> {
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

    const parsed = parseWorkspaceState(
      window.localStorage.getItem(WORKSPACE_STORAGE_KEY),
    );
    if (
      !parsed?.messagesByConversation ||
      Object.keys(parsed.messagesByConversation).length === 0
    ) {
      return;
    }

    await Promise.all(
      Object.entries(parsed.messagesByConversation).map(
        ([conversationId, messages]) =>
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
  if (
    state.registeredDeviceId === session.deviceId &&
    isStoredDeviceBundle(state.bundle)
  ) {
    return state.bundle;
  }

  const bundle = createStoredDeviceBundle();

  await relayDeviceApi.registerBundle(toPublicPrekeyBundle(bundle));
  writeWorkspaceState({
    ...state,
    registeredDeviceId: session.deviceId,
    bundle,
  });

  return bundle;
}

async function listDeviceBundles(accountId: string) {
  const cached = deviceBundleCache.get(accountId);
  if (cached) {
    return cached;
  }

  const request = relayDeviceApi.listBundles(accountId).catch((error) => {
    deviceBundleCache.delete(accountId);
    throw error;
  });

  deviceBundleCache.set(accountId, request);
  return request;
}

async function resolveSenderIdentityKey(accountId: string, deviceId: string) {
  const bundles = await listDeviceBundles(accountId);
  const bundle = bundles.find((entry) => entry.deviceId === deviceId);
  if (!bundle) {
    throw new Error("Sender device bundle is unavailable.");
  }

  return bundle.bundle.identityKeyB64;
}

export async function listStoredDmMessages(
  conversationId: string,
): Promise<StoredDmMessage[]> {
  await migrateLegacyWorkspaceState();
  return loadConversationMessages(conversationId);
}

export async function listStoredConversationMessages(
  conversationId: string,
): Promise<StoredDmMessage[]> {
  return listStoredDmMessages(conversationId);
}

export async function getConversationPreview(conversationId: string) {
  const messages = await listStoredDmMessages(conversationId);
  return messages[messages.length - 1] ?? null;
}

export async function getConversationPreviews(conversationIds: string[]) {
  const entries = await Promise.all(
    conversationIds.map(
      async (conversationId) =>
        [conversationId, await getConversationPreview(conversationId)] as const,
    ),
  );

  return Object.fromEntries(entries) as Record<string, StoredDmMessage | null>;
}

export async function ingestRelayEnvelopes(
  envelopes: CipherEnvelope[],
  options: { cursor?: string; acknowledge?: boolean } = {},
) {
  await migrateLegacyWorkspaceState();
  const registeredBundle = await ensureRelayDeviceBundle();
  const receivedConversationIds = new Set<string>();
  const ackEnvelopeIds = envelopes.map((envelope) => envelope.envelopeId);
  const updatedMessages = new Map<string, StoredDmMessage[]>();
  const state = readWorkspaceState();
  const knownEnvelopeIds = new Set(state.knownEnvelopeIds);

  for (const envelope of envelopes) {
    if (knownEnvelopeIds.has(envelope.envelopeId)) {
      continue;
    }

    let payload: EncryptedConversationPayload | null = null;
    try {
      payload = decryptConversationPayload<EncryptedConversationPayload>(
        envelope.ciphertext,
        await resolveSenderIdentityKey(
          envelope.senderAccountId,
          envelope.senderDeviceId,
        ),
        registeredBundle.privateKeyB64,
      );
    } catch {
      continue;
    }

    if (!payload || payload.kind !== "ember_conversation_v1") {
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
        attachment: payload.attachment
          ? {
              ...payload.attachment,
              downloadUrl: "",
            }
          : null,
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

  state.mailboxCursor =
    options.cursor ??
    envelopes[envelopes.length - 1]?.envelopeId ??
    state.mailboxCursor;
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
    if (
      sync.cursor.lastSeenEnvelopeId &&
      sync.cursor.lastSeenEnvelopeId !== state.mailboxCursor
    ) {
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

export async function encryptRelayAttachmentFile(file: File) {
  const plaintext = await file.arrayBuffer();
  return encryptAttachmentBytes(plaintext);
}

export async function sendConversationMessage(input: {
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
  const registeredBundle = await ensureRelayDeviceBundle();

  const members =
    "members" in input.conversation
      ? input.conversation.members
      : (await relayConversationApi.get(input.conversation.id)).members;
  const isDirectMessage = input.conversation.kind === "direct_message";
  const recipientAccounts = members.filter(
    (member) => member.accountId !== session.accountId,
  );
  if (isDirectMessage && recipientAccounts.length === 0) {
    throw new Error("A DM needs another member before it can send.");
  }

  const bundleLists = await Promise.all(
    Array.from(new Set(input.conversation.memberAccountIds)).map(
      async (accountId) => ({
        accountId,
        bundles: await listDeviceBundles(accountId),
      }),
    ),
  );
  const recipientDevices = bundleLists
    .flatMap((entry) => entry.bundles)
    .filter((bundle) => bundle.deviceId !== session.deviceId);

  if (recipientDevices.length === 0) {
    throw new Error(
      "No recipient devices are registered for this conversation yet.",
    );
  }

  const trimmedText = input.text?.trim();
  let attachment: WorkspaceEnvelopeAttachment | null = null;
  let attachmentIds: string[] = [];

  if (input.file) {
    const encrypted = await encryptRelayAttachmentFile(input.file);
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

    await uploadAttachment(
      ticket.uploadUrl,
      encrypted.ciphertext,
      "application/octet-stream",
    );
    attachment = {
      id: ticket.attachmentId,
      fileName: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      byteLength: input.file.size,
      contentClass: contentClassForMimeType(input.file.type),
      retentionMode: ticket.retentionMode,
      protectionProfile: ticket.protectionProfile,
      previewBlurHash: ticket.previewBlurHash ?? null,
      encryptionMode: ticket.encryptionMode,
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
  const payload: EncryptedConversationPayload = {
    version: 1,
    kind: "ember_conversation_v1",
    conversationId: input.conversation.id,
    conversationKind:
      input.conversation.kind === "direct_message"
        ? "direct_message"
        : input.conversation.kind === "room"
          ? "room"
          : "group",
    historyMode: "device_encrypted",
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
      ciphertext: encryptConversationPayload(
        payload,
        bundle.bundle.identityKeyB64,
        registeredBundle.privateKeyB64,
      ),
      clientMessageId,
      attachmentIds,
    })),
  });

  const existingMessages = await loadConversationMessages(
    input.conversation.id,
  );
  await persistConversationMessages(
    input.conversation.id,
    upsertMessageList(existingMessages, {
      id: clientMessageId,
      conversationId: input.conversation.id,
      senderAccountId: session.accountId,
      senderDisplayName: input.senderDisplayName,
      text: trimmedText,
      attachment: attachment ? { ...attachment, downloadUrl: "" } : null,
      createdAt,
      clientMessageId,
      status: "sent",
    }),
  );
}

export async function sendDirectMessage(input: {
  conversation: ConversationDetail | ConversationSummary;
  senderDisplayName: string;
  text?: string;
  file?: File | null;
}) {
  return sendConversationMessage(input);
}

export async function readRelayAttachmentBlob(
  attachment: RelayReadableAttachment,
) {
  const attachmentId = attachment.attachmentId ?? attachment.id;
  if (!attachmentId) {
    throw new Error("Attachment id is missing.");
  }

  if (
    attachment.encryptionMode !== "device_encrypted" ||
    !attachment.fileKeyB64 ||
    !attachment.fileIvB64
  ) {
    const access = await relayAttachmentApi.refreshDownloadUrl(attachmentId);
    const response = await fetch(access.downloadUrl);
    if (!response.ok) {
      throw new Error("Unable to fetch attachment bytes.");
    }

    const buffer = await response.arrayBuffer();
    return new Blob([buffer], { type: attachment.mimeType });
  }

  const access = await relayAttachmentApi.refreshDownloadUrl(attachmentId);
  const response = await fetch(access.downloadUrl);
  if (!response.ok) {
    throw new Error("Unable to fetch encrypted attachment bytes.");
  }

  const ciphertext = await response.arrayBuffer();
  const iv = decodeBytes(attachment.fileIvB64);
  const plaintext =
    iv.length === 24
      ? toArrayBuffer(
          decryptAttachmentBytes(
            ciphertext,
            attachment.fileKeyB64,
            attachment.fileIvB64,
          ),
        )
      : toArrayBuffer(
          new Uint8Array(
            await crypto.subtle.decrypt(
              { name: "AES-GCM", iv: new Uint8Array(toArrayBuffer(iv)) },
              await crypto.subtle.importKey(
                "raw",
                toArrayBuffer(decodeBytes(attachment.fileKeyB64)),
                "AES-GCM",
                false,
                ["decrypt"],
              ),
              ciphertext,
            ),
          ),
        );
  return new Blob([plaintext], { type: attachment.mimeType });
}

export async function readDmAttachmentBlob(
  attachment: WorkspaceEnvelopeAttachment,
) {
  return readRelayAttachmentBlob(attachment);
}

export async function ensureWorkspaceReady() {
  await migrateLegacyWorkspaceState();
  await ensureRelayDeviceBundle();
  await syncRelayMailbox();
}
