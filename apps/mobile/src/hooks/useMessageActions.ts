import { useCallback } from "react";
import type { ContextMenuAction } from "../components/MessageContextMenu";
import { groupThreadMessageStableId } from "../lib/messageIdentity";
import {
  markGroupThreadMessageDeleted,
  toggleGroupThreadMessageReaction,
} from "../lib/messageTransforms";
import type {
  AuthSession,
  FormMessage,
  GroupMembershipSummary,
  GroupThreadMessage,
} from "../types";

type SendEncryptedControlMessage = (args: {
  messageType: "reaction" | "delete";
  targetClientMessageId: string;
  emoji?: string;
  deletedAt?: string;
}) => Promise<void>;

type UpdateThreadMessagesAndCache = (
  conversationId: string,
  updater: (messages: GroupThreadMessage[]) => GroupThreadMessage[],
) => void;

type UseMessageActionsParams = {
  session: AuthSession | null;
  selectedGroup: GroupMembershipSummary | null;
  selectedConversationId: string | null;
  threadMessages: GroupThreadMessage[];
  replyingToMessage: GroupThreadMessage | null;
  sendEncryptedControlMessage: SendEncryptedControlMessage;
  updateThreadMessagesAndCache: UpdateThreadMessagesAndCache;
  relayFetch: <T>(session: AuthSession, path: string, init?: RequestInit) => Promise<T>;
  setReplyingToMessage: (msg: GroupThreadMessage | null) => void;
  setEditingMessageId: (id: string | null) => void;
  setMessageDraft: (draft: string) => void;
  setSessionMessage: (msg: FormMessage | null) => void;
};

export function useMessageActions({
  session,
  selectedGroup,
  selectedConversationId,
  threadMessages,
  replyingToMessage,
  sendEncryptedControlMessage,
  updateThreadMessagesAndCache,
  relayFetch,
  setReplyingToMessage,
  setEditingMessageId,
  setMessageDraft,
  setSessionMessage,
}: UseMessageActionsParams) {
  const toggleMessageReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!session || !selectedGroup) return;

      if (selectedGroup.historyMode !== "relay_hosted") {
        const target = threadMessages.find((m) => m.id === messageId);
        const targetClientMessageId = target
          ? groupThreadMessageStableId(target)
          : messageId;

        try {
          await sendEncryptedControlMessage({
            messageType: "reaction",
            targetClientMessageId,
            emoji,
          });
          updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
            toggleGroupThreadMessageReaction(
              messages,
              targetClientMessageId,
              emoji,
              session.accountId,
            ),
          );
        } catch (error) {
          setSessionMessage({
            tone: "error",
            title: "Reaction failed",
            body: error instanceof Error ? error.message : "Unable to update that reaction.",
          });
        }
        return;
      }

      try {
        const result = await relayFetch<{
          updated: boolean;
          messageId: string;
          reactions: Record<string, string[]>;
          updatedAt: string;
        }>(session, `/v1/groups/${selectedGroup.id}/messages/${messageId}/reactions`, {
          method: "POST",
          body: JSON.stringify({ emoji }),
        });
        updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
          messages.map((message) =>
            message.id === result.messageId
              ? { ...message, reactions: result.reactions }
              : message,
          ),
        );
      } catch (error) {
        setSessionMessage({
          tone: "error",
          title: "Reaction failed",
          body: error instanceof Error ? error.message : "Unable to update that reaction.",
        });
      }
    },
    [
      session,
      selectedGroup,
      threadMessages,
      sendEncryptedControlMessage,
      updateThreadMessagesAndCache,
      relayFetch,
      setSessionMessage,
    ],
  );

  const deleteMessageForEveryone = useCallback(
    async (messageId: string) => {
      if (!session || !selectedGroup) return;

      if (selectedGroup.historyMode !== "relay_hosted") {
        const target = threadMessages.find((m) => m.id === messageId);
        if (!target || target.senderAccountId !== session.accountId) return;

        const targetClientMessageId = groupThreadMessageStableId(target);
        const deletedAt = new Date().toISOString();

        try {
          await sendEncryptedControlMessage({
            messageType: "delete",
            targetClientMessageId,
            deletedAt,
          });
          if (replyingToMessage?.id === target.id) {
            setReplyingToMessage(null);
          }
          updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
            markGroupThreadMessageDeleted(messages, targetClientMessageId, deletedAt),
          );
        } catch (error) {
          setSessionMessage({
            tone: "error",
            title: "Delete failed",
            body: error instanceof Error
              ? error.message
              : "Unable to delete that message for everyone.",
          });
        }
        return;
      }

      try {
        const result = await relayFetch<{
          deleted: boolean;
          messageId: string;
          deletedAt: string;
        }>(session, `/v1/groups/${selectedGroup.id}/messages/${messageId}`, {
          method: "DELETE",
        });
        if (replyingToMessage?.id === result.messageId) {
          setReplyingToMessage(null);
        }
        updateThreadMessagesAndCache(selectedGroup.id, (messages) =>
          markGroupThreadMessageDeleted(messages, result.messageId, result.deletedAt),
        );
      } catch (error) {
        setSessionMessage({
          tone: "error",
          title: "Delete failed",
          body: error instanceof Error
            ? error.message
            : "Unable to delete that message for everyone.",
        });
      }
    },
    [
      session,
      selectedGroup,
      threadMessages,
      replyingToMessage,
      sendEncryptedControlMessage,
      updateThreadMessagesAndCache,
      relayFetch,
      setReplyingToMessage,
      setSessionMessage,
    ],
  );

  const deleteMessageLocally = useCallback(
    (messageId: string) => {
      const message = threadMessages.find((entry) => entry.id === messageId);
      const conversationId = message?.conversationId ?? selectedConversationId;
      if (!conversationId) return;

      if (replyingToMessage?.id === messageId) {
        setReplyingToMessage(null);
      }
      updateThreadMessagesAndCache(conversationId, (messages) =>
        messages.filter((entry) => entry.id !== messageId),
      );
    },
    [
      threadMessages,
      selectedConversationId,
      replyingToMessage,
      setReplyingToMessage,
      updateThreadMessagesAndCache,
    ],
  );

  const handleMessageAction = useCallback(
    (messageId: string, action: ContextMenuAction) => {
      const msg = threadMessages.find((m) => m.id === messageId);

      switch (action.kind) {
        case "reply":
          if (msg && !msg.deletedAt) {
            setReplyingToMessage(msg);
            setEditingMessageId(null);
          }
          break;
        case "react":
          void toggleMessageReaction(messageId, action.emoji);
          break;
        case "edit":
          if (msg?.text && !msg.deletedAt && selectedGroup?.historyMode === "relay_hosted") {
            setReplyingToMessage(null);
            setMessageDraft(msg.text);
            setEditingMessageId(messageId);
          }
          break;
        case "delete_for_everyone":
          void deleteMessageForEveryone(messageId);
          break;
        case "delete_local":
          deleteMessageLocally(messageId);
          break;
        case "copy":
        case "view":
          break;
      }
    },
    [
      threadMessages,
      selectedGroup,
      toggleMessageReaction,
      deleteMessageForEveryone,
      deleteMessageLocally,
      setReplyingToMessage,
      setEditingMessageId,
      setMessageDraft,
    ],
  );

  return { handleMessageAction };
}
