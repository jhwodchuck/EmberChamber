"use client";

const REACTION_STORAGE_KEY_PREFIX = "emberchamber.web.reactions.v1";

type ConversationReactionMap = Record<string, Record<string, string[]>>;

function storageKey(accountId: string | null | undefined) {
  return `${REACTION_STORAGE_KEY_PREFIX}:${accountId ?? "anon"}`;
}

function readAll(accountId: string | null | undefined): ConversationReactionMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(storageKey(accountId));
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as ConversationReactionMap;
  } catch {
    return {};
  }
}

function writeAll(
  accountId: string | null | undefined,
  data: ConversationReactionMap,
) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(storageKey(accountId), JSON.stringify(data));
}

export function readConversationReactions(
  accountId: string | null | undefined,
  conversationId: string,
): Record<string, string[]> {
  return readAll(accountId)[conversationId] ?? {};
}

export function toggleConversationMessageReaction(input: {
  accountId: string | null | undefined;
  conversationId: string;
  messageId: string;
  emoji: string;
}) {
  const all = readAll(input.accountId);
  const conversation = { ...(all[input.conversationId] ?? {}) };
  const current = new Set(conversation[input.messageId] ?? []);

  if (current.has(input.emoji)) {
    current.delete(input.emoji);
  } else {
    current.add(input.emoji);
  }

  const next = Array.from(current);
  if (next.length > 0) {
    conversation[input.messageId] = next;
  } else {
    delete conversation[input.messageId];
  }

  all[input.conversationId] = conversation;
  writeAll(input.accountId, all);

  return conversation;
}
