import type { EncryptedConversationPayload } from "@emberchamber/protocol";
import {
  decryptConversationPayload,
  toPublicPrekeyBundle,
} from "@emberchamber/protocol";
import * as SQLite from "expo-sqlite";
import {
  createDeviceBundleScaffold,
} from "../../lib/utils";
import {
  loadCachedGroupMessages,
  loadRelayStateValue,
  saveCachedGroupMessages,
  saveRelayStateValue,
} from "../../lib/db";
import {
  loadStoredDeviceBundle,
  saveStoredDeviceBundle,
} from "../../lib/session";
import type {
  AuthSession,
  DeviceKeyBundle,
  GroupMembershipSummary,
  GroupThreadMessage,
} from "../../types";

const MAILBOX_CURSOR_STATE_KEY = "mailbox_cursor";

type RelayFetch = <T>(
  session: AuthSession,
  path: string,
  init?: RequestInit,
) => Promise<T>;

function compareGroupThreadMessagesByCreatedAt(
  left: GroupThreadMessage,
  right: GroupThreadMessage,
) {
  return (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function mergeGroupThreadMessage(
  messages: GroupThreadMessage[],
  nextMessage: GroupThreadMessage,
) {
  return messages
    .filter((entry) => entry.id !== nextMessage.id)
    .concat(nextMessage)
    .sort(compareGroupThreadMessagesByCreatedAt);
}

export async function ensureDeviceBundleRegistered(args: {
  session: AuthSession;
  relayFetch: RelayFetch;
  deviceBundleDirectory: Map<string, DeviceKeyBundle[]>;
}) {
  const { session, relayFetch, deviceBundleDirectory } = args;
  const localBundle =
    (await loadStoredDeviceBundle(session.deviceId)) ??
    createDeviceBundleScaffold();
  await saveStoredDeviceBundle(session.deviceId, localBundle);

  const existingBundles = await relayFetch<DeviceKeyBundle[]>(
    session,
    `/v1/accounts/${session.accountId}/device-bundles`,
  );
  deviceBundleDirectory.set(session.accountId, existingBundles);

  if (
    existingBundles.some((bundle) => bundle.deviceId === session.deviceId) &&
    localBundle.privateKeyB64
  ) {
    return existingBundles;
  }

  await relayFetch<{ registered: boolean }>(session, "/v1/devices/register", {
    method: "POST",
    body: JSON.stringify(toPublicPrekeyBundle(localBundle)),
  });

  const confirmedBundles = await relayFetch<DeviceKeyBundle[]>(
    session,
    `/v1/accounts/${session.accountId}/device-bundles`,
  );
  deviceBundleDirectory.set(session.accountId, confirmedBundles);

  if (
    !confirmedBundles.some((bundle) => bundle.deviceId === session.deviceId)
  ) {
    throw new Error("This phone's device identity did not register correctly.");
  }

  return confirmedBundles;
}

export async function listDeviceBundlesForAccount(args: {
  session: AuthSession;
  accountId: string;
  relayFetch: RelayFetch;
  deviceBundleDirectory: Map<string, DeviceKeyBundle[]>;
}) {
  const { session, accountId, relayFetch, deviceBundleDirectory } = args;
  const cached = deviceBundleDirectory.get(accountId);
  if (cached) {
    return cached;
  }

  const bundles = await relayFetch<DeviceKeyBundle[]>(
    session,
    `/v1/accounts/${accountId}/device-bundles`,
  );
  deviceBundleDirectory.set(accountId, bundles);
  return bundles;
}

export async function loadStoredBundleOrThrow(currentSession: AuthSession) {
  const bundle = await loadStoredDeviceBundle(currentSession.deviceId);
  if (!bundle?.privateKeyB64) {
    throw new Error("This device is missing its private message key.");
  }

  return bundle as DeviceKeyBundle["bundle"] & { privateKeyB64: string };
}

export async function syncEncryptedMailbox(args: {
  db: SQLite.SQLiteDatabase | null;
  session: AuthSession;
  relayFetch: RelayFetch;
  deviceBundleDirectory: Map<string, DeviceKeyBundle[]>;
  refreshConversationCatalog?: () => void;
}) {
  const {
    db,
    session,
    relayFetch,
    deviceBundleDirectory,
    refreshConversationCatalog,
  } = args;

  if (!db) {
    return { receivedConversationIds: [] as string[] };
  }

  await ensureDeviceBundleRegistered({
    session,
    relayFetch,
    deviceBundleDirectory,
  });
  const localBundle = await loadStoredBundleOrThrow(session);
  const cursor = await loadRelayStateValue(db, MAILBOX_CURSOR_STATE_KEY);
  const sync = await relayFetch<{
    cursor: { lastSeenEnvelopeId?: string };
    envelopes: Array<{
      envelopeId: string;
      conversationId: string;
      senderAccountId: string;
      senderDeviceId: string;
      ciphertext: string;
    }>;
  }>(
    session,
    `/v1/mailbox/sync?after=${encodeURIComponent(cursor ?? "")}&limit=${encodeURIComponent(String(100))}`,
  );

  const receivedConversationIds = new Set<string>();
  const updatedMessages = new Map<string, GroupThreadMessage[]>();
  const ackEnvelopeIds: string[] = [];

  for (const envelope of sync.envelopes) {
    try {
      const senderBundles = await listDeviceBundlesForAccount({
        session,
        accountId: envelope.senderAccountId,
        relayFetch,
        deviceBundleDirectory,
      });
      const senderBundle = senderBundles.find(
        (entry) => entry.deviceId === envelope.senderDeviceId,
      );
      if (!senderBundle) {
        continue;
      }

      const payload =
        decryptConversationPayload<EncryptedConversationPayload>(
          envelope.ciphertext,
          senderBundle.bundle.identityKeyB64,
          localBundle.privateKeyB64,
        );

      if (payload.kind !== "ember_conversation_v1") {
        continue;
      }

      const conversationMessages =
        updatedMessages.get(envelope.conversationId) ??
        (await loadCachedGroupMessages(db, envelope.conversationId));
      const messageId = `${envelope.envelopeId}:${payload.clientMessageId}`;
      const nextMessage: GroupThreadMessage = {
        id: messageId,
        conversationId: envelope.conversationId,
        historyMode: "device_encrypted",
        senderAccountId: envelope.senderAccountId,
        senderDisplayName: payload.senderDisplayName,
        kind: payload.attachment ? "media" : "text",
        text: payload.text,
        attachment: payload.attachment
          ? {
              ...payload.attachment,
              downloadUrl: "",
            }
          : null,
        createdAt: payload.createdAt,
      };

      const mergedMessages = mergeGroupThreadMessage(
        conversationMessages,
        nextMessage,
      );

      updatedMessages.set(envelope.conversationId, mergedMessages);
      receivedConversationIds.add(envelope.conversationId);
      ackEnvelopeIds.push(envelope.envelopeId);
    } catch {
      // Ignore envelopes that this device cannot open.
    }
  }

  await Promise.all(
    Array.from(updatedMessages.entries()).map(([conversationId, messages]) =>
      saveCachedGroupMessages(db, conversationId, messages),
    ),
  );

  if (updatedMessages.size > 0) {
    refreshConversationCatalog?.();
  }

  if (sync.cursor.lastSeenEnvelopeId) {
    await saveRelayStateValue(
      db,
      MAILBOX_CURSOR_STATE_KEY,
      sync.cursor.lastSeenEnvelopeId,
    );
  }

  if (ackEnvelopeIds.length > 0) {
    await relayFetch<{ acknowledged: number }>(session, "/v1/mailbox/ack", {
      method: "POST",
      body: JSON.stringify({ envelopeIds: ackEnvelopeIds }),
    });
  }

  return {
    receivedConversationIds: Array.from(receivedConversationIds),
  };
}

export async function refreshConversationThread(args: {
  db: SQLite.SQLiteDatabase | null;
  session: AuthSession;
  conversationId: string;
  groups: GroupMembershipSummary[];
  relayFetch: RelayFetch;
  deviceBundleDirectory: Map<string, DeviceKeyBundle[]>;
  refreshConversationCatalog?: () => void;
}) {
  const {
    db,
    session,
    conversationId,
    groups,
    relayFetch,
    deviceBundleDirectory,
    refreshConversationCatalog,
  } = args;

  const targetGroup = groups.find((group) => group.id === conversationId);
  if (targetGroup?.historyMode === "device_encrypted") {
    if (!db) {
      return [];
    }

    await syncEncryptedMailbox({
      db,
      session,
      relayFetch,
      deviceBundleDirectory,
      refreshConversationCatalog,
    });
    return loadCachedGroupMessages(db, conversationId);
  }

  const messages = await relayFetch<GroupThreadMessage[]>(
    session,
    `/v1/groups/${conversationId}/messages?limit=100`,
  );

  if (db) {
    await saveCachedGroupMessages(db, conversationId, messages);
    refreshConversationCatalog?.();
  }

  const latest = messages[messages.length - 1];
  if (latest) {
    void relayFetch<{ acked: boolean }>(
      session,
      `/v1/groups/${conversationId}/messages/ack`,
      {
        method: "POST",
        body: JSON.stringify({ lastReadMessageCreatedAt: latest.createdAt }),
      },
    ).catch(() => undefined);
  }

  return messages;
}
