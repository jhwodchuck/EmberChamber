"use client";

import type { StoredDmMessage } from "@/lib/relay-workspace";

const STORAGE_KEY_PREFIX =
  "emberchamber.web.workspace.v1.conversation-preferences";

export const CHAT_LIST_FILTERS = [
  "all",
  "unread",
  "pinned",
  "archived",
] as const;

export type ChatListFilter = (typeof CHAT_LIST_FILTERS)[number];

export type ConversationPreference = {
  conversationId: string;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  lastReadAt: string | null;
};

export function createConversationPreference(
  conversationId: string,
): ConversationPreference {
  return {
    conversationId,
    isArchived: false,
    isPinned: false,
    isMuted: false,
    lastReadAt: null,
  };
}

function preferenceStorageKey(accountId: string) {
  return `${STORAGE_KEY_PREFIX}:${accountId}`;
}

export function readConversationPreferences(
  accountId: string | null | undefined,
): Record<string, ConversationPreference> {
  if (typeof window === "undefined" || !accountId) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(preferenceStorageKey(accountId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, ConversationPreference>;
    return Object.fromEntries(
      Object.entries(parsed).map(([conversationId, preference]) => [
        conversationId,
        {
          ...createConversationPreference(conversationId),
          ...preference,
          conversationId,
        },
      ]),
    );
  } catch {
    return {};
  }
}

export function writeConversationPreferences(
  accountId: string | null | undefined,
  preferences: Record<string, ConversationPreference>,
) {
  if (typeof window === "undefined" || !accountId) {
    return;
  }

  window.localStorage.setItem(
    preferenceStorageKey(accountId),
    JSON.stringify(preferences),
  );
}

export function getConversationPreference(
  preferences: Record<string, ConversationPreference>,
  conversationId: string,
) {
  return preferences[conversationId] ?? createConversationPreference(conversationId);
}

export function updateConversationPreferenceMap(
  preferences: Record<string, ConversationPreference>,
  conversationId: string,
  patch: Partial<Omit<ConversationPreference, "conversationId">>,
) {
  return {
    ...preferences,
    [conversationId]: {
      ...getConversationPreference(preferences, conversationId),
      ...patch,
      conversationId,
    },
  };
}

export function estimateConversationUnreadCount(input: {
  accountId: string | null | undefined;
  conversation: {
    id: string;
    historyMode: "relay_hosted" | "device_encrypted";
    updatedAt: string;
    lastMessageAt?: string | null;
  };
  preference: ConversationPreference;
  storedMessages?: StoredDmMessage[];
}) {
  if (
    input.conversation.historyMode === "device_encrypted" &&
    input.accountId &&
    input.storedMessages?.length
  ) {
    return input.storedMessages.filter((message) => {
      if (message.senderAccountId === input.accountId) {
        return false;
      }

      if (!input.preference.lastReadAt) {
        return true;
      }

      return message.createdAt > input.preference.lastReadAt;
    }).length;
  }

  const latestActivity =
    input.conversation.lastMessageAt ?? input.conversation.updatedAt;

  if (!input.conversation.lastMessageAt) {
    return 0;
  }
  return !input.preference.lastReadAt ||
    latestActivity > input.preference.lastReadAt
    ? 1
    : 0;
}
