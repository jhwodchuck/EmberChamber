import { groupThreadMessageMatchesId } from "./messageIdentity";
import type { GroupThreadMessage } from "../types";

export function markGroupThreadMessageDeleted(
  messages: GroupThreadMessage[],
  messageId: string,
  deletedAt: string,
) {
  return messages.map((message) => {
    let nextMessage = message;

    if (groupThreadMessageMatchesId(message, messageId)) {
      nextMessage = {
        ...message,
        text: null,
        attachment: null,
        reactions: {},
        deletedAt,
      };
    }

    if (nextMessage.replyTo?.messageId === messageId) {
      nextMessage = {
        ...nextMessage,
        replyTo: {
          ...nextMessage.replyTo,
          text: "Message deleted",
        },
      };
    }

    return nextMessage;
  });
}

export function toggleGroupThreadMessageReaction(
  messages: GroupThreadMessage[],
  messageId: string,
  emoji: string,
  accountId: string,
) {
  return messages.map((message) => {
    if (!groupThreadMessageMatchesId(message, messageId)) {
      return message;
    }

    const reactions = { ...(message.reactions ?? {}) };
    const current = new Set(reactions[emoji] ?? []);
    if (current.has(accountId)) {
      current.delete(accountId);
    } else {
      current.add(accountId);
    }

    if (current.size > 0) {
      reactions[emoji] = Array.from(current).sort();
    } else {
      delete reactions[emoji];
    }

    return { ...message, reactions };
  });
}
