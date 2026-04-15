import type { ConversationKind } from "@emberchamber/protocol";

export function conversationHref(input: {
  id: string;
  kind: ConversationKind;
}) {
  return input.kind === "community"
    ? `/app/community/${input.id}`
    : `/app/chat/${input.id}`;
}

export function acceptedInviteHref(input: {
  conversationId: string;
  rootConversationId: string;
  rootConversationKind: "group" | "community";
}) {
  if (
    input.rootConversationKind === "community" &&
    input.conversationId === input.rootConversationId
  ) {
    return `/app/community/${input.rootConversationId}`;
  }

  return `/app/chat/${input.conversationId}`;
}
