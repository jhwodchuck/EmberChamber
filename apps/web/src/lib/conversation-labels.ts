import type { ConversationKind } from "@emberchamber/protocol";

type WebConversationType = ConversationKind | "dm";

export function conversationTypeLabel(kind: WebConversationType) {
  switch (kind) {
    case "direct_message":
    case "dm":
      return "DM";
    case "community":
      return "Community";
    case "room":
      return "Room";
    default:
      return "Group";
  }
}

export function conversationDefaultTitle(kind: WebConversationType) {
  switch (kind) {
    case "direct_message":
    case "dm":
      return "Direct message";
    case "community":
      return "Community";
    case "room":
      return "Room";
    default:
      return "Group";
  }
}
