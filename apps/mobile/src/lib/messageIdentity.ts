import type { GroupThreadMessage } from "../types";

export function groupThreadMessageStableId(message: GroupThreadMessage) {
  if (message.clientMessageId) {
    return message.clientMessageId;
  }

  if (message.historyMode === "device_encrypted") {
    const separatorIndex = message.id.lastIndexOf(":");
    if (separatorIndex >= 0 && separatorIndex < message.id.length - 1) {
      return message.id.slice(separatorIndex + 1);
    }
  }

  return message.id;
}

export function groupThreadMessageMatchesId(
  message: GroupThreadMessage,
  messageId: string,
) {
  return (
    message.id === messageId || groupThreadMessageStableId(message) === messageId
  );
}
