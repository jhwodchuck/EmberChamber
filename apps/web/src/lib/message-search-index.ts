"use client";

import type { GroupThreadMessage } from "@emberchamber/protocol";
import type { StoredDmMessage } from "@/lib/relay-workspace";

type IndexedMessage = {
  conversationId: string;
  messageId: string;
  text: string;
  senderDisplayName: string;
  createdAt: string;
};

type MessageIndexStore = {
  conversations: Record<
    string,
    {
      updatedAt: string;
      lastMessagePreview: string | null;
      messages: IndexedMessage[];
    }
  >;
};

const STORAGE_KEY = "emberchamber.web.message-index.v1";

function readStore(): MessageIndexStore {
  if (typeof window === "undefined") {
    return { conversations: {} };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { conversations: {} };
    }
    return JSON.parse(raw) as MessageIndexStore;
  } catch {
    return { conversations: {} };
  }
}

function writeStore(store: MessageIndexStore) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function toPreview(text: string | null | undefined) {
  if (!text) {
    return null;
  }
  return text.trim().slice(0, 180) || null;
}

export function indexEncryptedConversationMessages(
  conversationId: string,
  messages: StoredDmMessage[],
) {
  const normalized: IndexedMessage[] = messages
    .filter((message) => Boolean(message.text?.trim()))
    .map((message) => ({
      conversationId,
      messageId: message.id,
      text: message.text?.trim() ?? "",
      senderDisplayName: message.senderDisplayName,
      createdAt: message.createdAt,
    }));

  const latest = messages[messages.length - 1];
  const store = readStore();
  store.conversations[conversationId] = {
    updatedAt: new Date().toISOString(),
    lastMessagePreview:
      toPreview(latest?.text) ?? latest?.attachment?.fileName ?? null,
    messages: normalized,
  };
  writeStore(store);
}

export function indexRelayConversationMessages(
  conversationId: string,
  messages: GroupThreadMessage[],
) {
  const normalized: IndexedMessage[] = messages
    .filter(
      (message) =>
        !message.deletedAt && Boolean(message.text?.trim()),
    )
    .map((message) => ({
      conversationId,
      messageId: message.id,
      text: message.text?.trim() ?? "",
      senderDisplayName: message.senderDisplayName,
      createdAt: message.createdAt,
    }));

  const latest = messages[messages.length - 1];
  const store = readStore();
  store.conversations[conversationId] = {
    updatedAt: new Date().toISOString(),
    lastMessagePreview:
      toPreview(latest?.text) ?? latest?.attachment?.fileName ?? null,
    messages: normalized,
  };
  writeStore(store);
}

export function getIndexedConversationPreview(conversationId: string) {
  const store = readStore();
  return store.conversations[conversationId]?.lastMessagePreview ?? null;
}

export function searchIndexedMessages(
  query: string,
  options: { conversationId?: string; limit?: number } = {},
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [] as IndexedMessage[];
  }

  const { conversationId, limit = 120 } = options;
  const store = readStore();
  const conversationEntries = Object.entries(store.conversations).filter(
    ([id]) => !conversationId || id === conversationId,
  );

  const matches: IndexedMessage[] = [];
  for (const [, entry] of conversationEntries) {
    for (const message of entry.messages) {
      const haystack = `${message.text} ${message.senderDisplayName}`.toLowerCase();
      if (haystack.includes(normalizedQuery)) {
        matches.push(message);
      }
    }
  }

  return matches
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
