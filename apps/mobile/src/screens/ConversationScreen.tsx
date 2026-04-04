import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  AuthSession,
  GroupInviteRecord,
  GroupMembershipSummary,
  GroupThreadMessage,
  PendingAttachment,
} from "../types";
import { styles, theme } from "../styles";
import { formatBytes } from "../lib/utils";
import { MessageBubble } from "../components/MessageBubble";
import type { ContextMenuAction } from "../components/MessageContextMenu";

type ConversationRow =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; message: GroupThreadMessage };

function formatConversationDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function buildConversationRows(messages: GroupThreadMessage[]): ConversationRow[] {
  const rows: ConversationRow[] = [];
  let activeDate = "";

  for (const message of messages) {
    const messageDate = message.createdAt.slice(0, 10);

    if (messageDate !== activeDate) {
      activeDate = messageDate;
      rows.push({
        type: "date",
        key: `date-${messageDate}`,
        label: formatConversationDate(message.createdAt),
      });
    }

    rows.push({
      type: "message",
      key: message.id,
      message,
    });
  }

  return rows;
}

function conversationInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || "#";
}

export type ConversationScreenProps = {
  session: AuthSession;
  selectedGroup: GroupMembershipSummary;
  threadMessages: GroupThreadMessage[];
  messageDraft: string;
  setMessageDraft: Dispatch<SetStateAction<string>>;
  pendingAttachment: PendingAttachment | null;
  setPendingAttachment: Dispatch<SetStateAction<PendingAttachment | null>>;
  isLoadingThread: boolean;
  isPickingPhoto: boolean;
  isSendingMessage: boolean;
  editingMessageId: string | null;
  onCancelEdit: () => void;
  onTakePhoto: () => void;
  onPickPhoto: () => void;
  onSendMessage: () => void;
  onBack: () => void;
  onImageError: (messageId: string) => void;
  onMessageAction: (messageId: string, action: ContextMenuAction) => void;
  onUpdateGroup: (title: string, sensitiveMedia: boolean) => Promise<void>;
  onCreateInvite: () => Promise<GroupInviteRecord | null>;
};

export function ConversationScreen({
  session,
  selectedGroup,
  threadMessages,
  messageDraft,
  setMessageDraft,
  pendingAttachment,
  setPendingAttachment,
  isLoadingThread,
  isPickingPhoto,
  isSendingMessage,
  editingMessageId,
  onCancelEdit,
  onTakePhoto,
  onPickPhoto,
  onSendMessage,
  onBack,
  onImageError,
  onMessageAction,
  onUpdateGroup,
  onCreateInvite,
}: ConversationScreenProps) {
  const sendDisabled = (!messageDraft.trim() && !pendingAttachment) || isSendingMessage;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState(selectedGroup.title);
  const [settingsSensitive, setSettingsSensitive] = useState(selectedGroup.sensitiveMediaDefault);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<GroupInviteRecord | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const listRef = useRef<FlatList<ConversationRow>>(null);
  const previousRowCountRef = useRef(0);

  const conversationRows = useMemo(
    () => buildConversationRows(threadMessages),
    [threadMessages],
  );

  useEffect(() => {
    const shouldAnimate = previousRowCountRef.current > 0;
    previousRowCountRef.current = conversationRows.length;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: shouldAnimate });
    });
  }, [conversationRows.length]);

  async function handleSaveSettings() {
    try {
      setIsSavingSettings(true);
      setSettingsError(null);
      await onUpdateGroup(settingsTitle, settingsSensitive);
      setSettingsOpen(false);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleCreateInvite() {
    try {
      setIsCreatingInvite(true);
      const invite = await onCreateInvite();
      setNewInvite(invite);
    } finally {
      setIsCreatingInvite(false);
    }
  }

  function openSettings() {
    setSettingsTitle(selectedGroup.title);
    setSettingsSensitive(selectedGroup.sensitiveMediaDefault);
    setSettingsError(null);
    setNewInvite(null);
    setSettingsOpen(true);
  }

  const sendLabel = isSendingMessage
    ? pendingAttachment && !editingMessageId
      ? "Uploading…"
      : editingMessageId
        ? "Saving…"
        : "Sending…"
    : editingMessageId
      ? "Save"
      : "Send";

  return (
    <View style={styles.conversationShell}>
      <View style={styles.conversationTopBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Chats</Text>
        </Pressable>

        <View style={styles.conversationIdentity}>
          <View style={styles.conversationAvatar}>
            <Text style={styles.conversationAvatarText}>
              {conversationInitial(selectedGroup.title)}
            </Text>
          </View>

          <View style={styles.conversationHeaderCopy}>
            <Text style={styles.conversationTitle} numberOfLines={1}>
              {selectedGroup.title}
            </Text>
            <Text style={styles.conversationSubtitle}>
              {selectedGroup.memberCount}/{selectedGroup.memberCap} members
            </Text>
          </View>
        </View>

        {selectedGroup.canCreateInvites || selectedGroup.canManageMembers ? (
          <Pressable onPress={openSettings} style={styles.conversationOverflowButton}>
            <Text style={styles.conversationOverflowLabel}>More</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoadingThread ? (
        <View style={[styles.conversationMessages, styles.conversationLoadingState]}>
          <View style={styles.threadList}>
            <View style={styles.skeletonBubble} />
            <View style={[styles.skeletonBubble, styles.skeletonBubbleSoft]} />
            <View style={[styles.skeletonBubble, styles.skeletonBubbleFaint]} />
          </View>
        </View>
      ) : threadMessages.length ? (
        <FlatList
          ref={listRef}
          style={styles.conversationMessages}
          contentContainerStyle={styles.conversationMessagesContent}
          data={conversationRows}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            item.type === "date" ? (
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorLabel}>{item.label}</Text>
              </View>
            ) : (
              <MessageBubble
                message={item.message}
                isOwnMessage={item.message.senderAccountId === session.accountId}
                onImageError={onImageError}
                onAction={onMessageAction}
              />
            )
          }
        />
      ) : (
        <View style={[styles.conversationMessages, styles.emptyState]}>
          <Text style={styles.emptyStateTitle}>No messages yet</Text>
          <Text style={styles.emptyStateBody}>
            {selectedGroup.historyMode === "device_encrypted"
              ? "New messages will start here on this phone."
              : "Send the first message."}
          </Text>
        </View>
      )}

      <View style={styles.conversationComposer}>
        {editingMessageId ? (
          <View style={styles.editModeBanner}>
            <Text style={styles.editModeBannerText}>Editing message</Text>
            <Pressable onPress={onCancelEdit}>
              <Text style={styles.inlineAction}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}

        {pendingAttachment && !editingMessageId ? (
          <View style={styles.pendingAttachmentCard}>
            <View style={styles.pendingAttachmentHeader}>
              <Text style={styles.infoTitle}>Photo ready</Text>
              <Pressable onPress={() => setPendingAttachment(null)}>
                <Text style={styles.inlineAction}>Remove</Text>
              </Pressable>
            </View>
            <Image
              source={{ uri: pendingAttachment.uri }}
              style={styles.pendingAttachmentImage}
              resizeMode="cover"
            />
            <Text style={styles.helper}>
              {pendingAttachment.fileName} · {formatBytes(pendingAttachment.byteLength || 0)}
            </Text>
          </View>
        ) : null}

        <View style={styles.composerDock}>
          {!editingMessageId ? (
            <View style={styles.composerAttachColumn}>
              <Pressable
                style={styles.composerAttachButton}
                onPress={onTakePhoto}
                disabled={isPickingPhoto}
              >
                <Text style={styles.composerAttachLabel}>
                  {isPickingPhoto ? "..." : "Cam"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.composerAttachButton,
                  isPickingPhoto ? styles.primaryButtonDisabled : null,
                ]}
                onPress={onPickPhoto}
                disabled={isPickingPhoto}
              >
                <Text style={styles.composerAttachLabel}>Photo</Text>
              </Pressable>
            </View>
          ) : null}

          <TextInput
            multiline
            placeholder={editingMessageId ? "Edit message" : "Message"}
            placeholderTextColor={theme.colors.placeholder}
            style={[styles.input, styles.composerInputDocked]}
            value={messageDraft}
            onChangeText={setMessageDraft}
          />

          <Pressable
            style={[
              styles.composerSendButtonDocked,
              sendDisabled ? styles.primaryButtonDisabled : null,
            ]}
            onPress={onSendMessage}
            disabled={sendDisabled}
          >
            <Text style={styles.composerSendButtonLabel}>{sendLabel}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={settingsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSettingsOpen(false)}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Conversation</Text>

            {selectedGroup.canManageMembers ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={settingsTitle}
                  onChangeText={setSettingsTitle}
                  maxLength={80}
                  placeholderTextColor={theme.colors.placeholder}
                  placeholder="Group name"
                />
              </View>
            ) : null}

            {selectedGroup.canManageMembers ? (
              <Pressable
                style={styles.checkboxCard}
                onPress={() => setSettingsSensitive((value) => !value)}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    settingsSensitive ? styles.checkboxBoxChecked : null,
                  ]}
                >
                  {settingsSensitive ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <View style={styles.checkboxCopy}>
                  <Text style={styles.label}>Sensitive media defaults</Text>
                  <Text style={styles.helper}>New members start with blur enabled.</Text>
                </View>
              </Pressable>
            ) : null}

            {settingsError ? <Text style={styles.errorText}>{settingsError}</Text> : null}

            {selectedGroup.canManageMembers ? (
              <Pressable
                style={[styles.primaryButton, isSavingSettings ? styles.primaryButtonDisabled : null]}
                onPress={handleSaveSettings}
                disabled={isSavingSettings}
              >
                <Text style={styles.primaryButtonLabel}>
                  {isSavingSettings ? "Saving…" : "Save changes"}
                </Text>
              </Pressable>
            ) : null}

            {selectedGroup.canCreateInvites ? (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Invite</Text>
                <Pressable
                  style={[styles.secondaryButton, isCreatingInvite ? styles.primaryButtonDisabled : null]}
                  onPress={handleCreateInvite}
                  disabled={isCreatingInvite}
                >
                  <Text style={styles.secondaryButtonLabel}>
                    {isCreatingInvite ? "Generating…" : "Create link"}
                  </Text>
                </Pressable>
                {newInvite ? (
                  <View style={styles.inviteLinkBox}>
                    <Text selectable style={styles.codeText}>
                      {`/invite/${selectedGroup.id}/${newInvite.id}`}
                    </Text>
                    <Text style={styles.helper}>
                      {newInvite.status} · {newInvite.useCount}
                      {newInvite.maxUses ? `/${newInvite.maxUses}` : ""} uses
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
