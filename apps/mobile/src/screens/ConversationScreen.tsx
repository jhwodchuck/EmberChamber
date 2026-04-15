import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Text,
  TextInput,
  type ViewToken,
  View,
} from "react-native";
import type {
  AuthSession,
  GroupInviteRecord,
  GroupMember,
  GroupMembershipSummary,
  GroupThreadMessage,
  PendingAttachment,
} from "../types";
import { styles, theme } from "../styles";
import { formatBytes } from "../lib/utils";
import { MessageBubble } from "../components/MessageBubble";
import type { ContextMenuAction } from "../components/MessageContextMenu";
import { MemberRosterModal } from "../components/MemberRosterModal";
import { MemberProfileSheet } from "../components/MemberProfileSheet";
import {
  AttachMenuSheet,
  type AttachMenuAction,
} from "../components/AttachMenuSheet";
import {
  LocationPickerSheet,
  type LocationChoice,
} from "../components/LocationPickerSheet";
import { PollCreatorSheet } from "../components/PollCreatorSheet";
import { ChecklistCreatorSheet } from "../components/ChecklistCreatorSheet";

const AUTO_SCROLL_THRESHOLD = 96;

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

function buildConversationRows(
  messages: GroupThreadMessage[],
): ConversationRow[] {
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

function describePendingAttachment(attachment: PendingAttachment) {
  if (attachment.mimeType.startsWith("image/")) {
    return {
      title: "Photo ready",
      previewLabel: "Photo preview",
      icon: "🖼️",
      isImage: true,
    };
  }

  if (attachment.mimeType.startsWith("video/")) {
    return {
      title: "Video ready",
      previewLabel: "Video attached",
      icon: "🎬",
      isImage: false,
    };
  }

  if (attachment.mimeType.startsWith("audio/")) {
    return {
      title: "Audio ready",
      previewLabel: "Audio attached",
      icon: "🎤",
      isImage: false,
    };
  }

  return {
    title: "File ready",
    previewLabel: "Attachment attached",
    icon: "📄",
    isImage: false,
  };
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
  onPickFile: () => void;
  onPickLocation: (choice: LocationChoice) => void;
  onSendRawText: (text: string) => void;
  onSendMessage: () => void;
  onBack: () => void;
  showBackButton?: boolean;
  restoredAnchorMessageId?: string | null;
  onAnchorMessageChange?: (messageId: string | null) => void;
  onImageError: (messageId: string) => void;
  onResolveAttachmentAccess?: (
    messageId: string,
    attachment: NonNullable<GroupThreadMessage["attachment"]>,
  ) => Promise<NonNullable<GroupThreadMessage["attachment"]> | null>;
  onMessageAction: (messageId: string, action: ContextMenuAction) => void;
  onUpdateGroup: (title: string, sensitiveMedia: boolean) => Promise<void>;
  onCreateInvite: () => Promise<GroupInviteRecord | null>;
  // member roster
  groupMembers: GroupMember[];
  isLoadingMembers: boolean;
  isOpeningDm: boolean;
  onOpenMembers: () => void;
  onLoadMemberNote: (accountId: string) => Promise<string | null>;
  onSaveMemberNote: (accountId: string, note: string) => Promise<void>;
  onOpenDm: (targetAccountId: string, displayName: string) => Promise<void>;
  onSendContactRequest: (targetAccountId: string, displayName: string) => void;
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
  onPickFile,
  onPickLocation,
  onSendRawText,
  onSendMessage,
  onBack,
  showBackButton = true,
  restoredAnchorMessageId = null,
  onAnchorMessageChange,
  onImageError,
  onResolveAttachmentAccess,
  onMessageAction,
  onUpdateGroup,
  onCreateInvite,
  groupMembers,
  isLoadingMembers,
  isOpeningDm,
  onOpenMembers,
  onLoadMemberNote,
  onSaveMemberNote,
  onOpenDm,
  onSendContactRequest,
}: ConversationScreenProps) {
  const sendDisabled =
    (!messageDraft.trim() && !pendingAttachment) || isSendingMessage;
  const pendingAttachmentView = pendingAttachment
    ? describePendingAttachment(pendingAttachment)
    : null;
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [pollCreatorOpen, setPollCreatorOpen] = useState(false);
  const [checklistCreatorOpen, setChecklistCreatorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState(selectedGroup.title);
  const [settingsSensitive, setSettingsSensitive] = useState(
    selectedGroup.sensitiveMediaDefault,
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<GroupInviteRecord | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<GroupMember | null>(null);
  const [profileNote, setProfileNote] = useState<string | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const listRef = useRef<FlatList<ConversationRow>>(null);
  const shouldAutoScrollRef = useRef(true);
  const previousConversationIdRef = useRef<string | null>(null);
  const previousMessageWindowRef = useRef<{
    firstMessageId: string | null;
    lastMessageId: string | null;
  }>({
    firstMessageId: null,
    lastMessageId: null,
  });
  const appliedRestoreSignatureRef = useRef<string | null>(null);
  const lastReportedAnchorIdRef = useRef<string | null>(null);
  const anchorChangeHandlerRef = useRef<typeof onAnchorMessageChange>(
    onAnchorMessageChange,
  );
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 60 });
  const onViewableItemsChangedRef = useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<ViewToken<ConversationRow>>;
    }) => {
      const firstVisibleMessage = viewableItems.find(
        (item) => item.item?.type === "message",
      );
      const nextAnchorId =
        firstVisibleMessage?.item?.type === "message"
          ? firstVisibleMessage.item.message.id
          : null;

      if (lastReportedAnchorIdRef.current === nextAnchorId) {
        return;
      }

      lastReportedAnchorIdRef.current = nextAnchorId;
      anchorChangeHandlerRef.current?.(nextAnchorId);
    },
  );

  const conversationRows = useMemo(
    () => buildConversationRows(threadMessages),
    [threadMessages],
  );
  const firstMessageId = threadMessages[0]?.id ?? null;
  const lastMessageId = threadMessages[threadMessages.length - 1]?.id ?? null;
  const restoredAnchorIndex = useMemo(
    () =>
      restoredAnchorMessageId
        ? conversationRows.findIndex(
            (row) =>
              row.type === "message" &&
              row.message.id === restoredAnchorMessageId,
          )
        : -1,
    [conversationRows, restoredAnchorMessageId],
  );

  useEffect(() => {
    anchorChangeHandlerRef.current = onAnchorMessageChange;
  }, [onAnchorMessageChange]);

  useEffect(() => {
    appliedRestoreSignatureRef.current = null;
    lastReportedAnchorIdRef.current = null;
  }, [selectedGroup.id]);

  useEffect(() => {
    const conversationChanged =
      previousConversationIdRef.current !== selectedGroup.id;
    const previousWindow = previousMessageWindowRef.current;
    const initialThreadLoad =
      !conversationChanged &&
      previousWindow.lastMessageId == null &&
      lastMessageId != null;
    const appendedMessage =
      !conversationChanged &&
      previousWindow.lastMessageId != null &&
      previousWindow.lastMessageId !== lastMessageId &&
      previousWindow.firstMessageId === firstMessageId;
    const shouldRestoreAnchor =
      conversationChanged &&
      restoredAnchorMessageId != null &&
      restoredAnchorIndex >= 0;

    previousConversationIdRef.current = selectedGroup.id;
    previousMessageWindowRef.current = {
      firstMessageId,
      lastMessageId,
    };

    if (conversationChanged) {
      shouldAutoScrollRef.current = !shouldRestoreAnchor;
    }

    if (
      !conversationRows.length ||
      shouldRestoreAnchor ||
      (!conversationChanged &&
        !initialThreadLoad &&
        !(appendedMessage && shouldAutoScrollRef.current))
    ) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: !conversationChanged });
    });
  }, [
    conversationRows.length,
    firstMessageId,
    lastMessageId,
    restoredAnchorIndex,
    restoredAnchorMessageId,
    selectedGroup.id,
  ]);

  useEffect(() => {
    if (
      !conversationRows.length ||
      restoredAnchorIndex < 0 ||
      !restoredAnchorMessageId
    ) {
      return;
    }

    const restoreSignature = `${selectedGroup.id}:${restoredAnchorMessageId}`;
    if (appliedRestoreSignatureRef.current === restoreSignature) {
      return;
    }

    appliedRestoreSignatureRef.current = restoreSignature;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: restoredAnchorIndex,
        animated: false,
        viewPosition: 0,
      });
    });
  }, [
    conversationRows.length,
    restoredAnchorIndex,
    restoredAnchorMessageId,
    selectedGroup.id,
  ]);

  function handleConversationScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    shouldAutoScrollRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
  }

  function handleScrollToIndexFailed({
    averageItemLength,
    index,
  }: {
    averageItemLength: number;
    index: number;
  }) {
    const estimatedOffset = Math.max(0, averageItemLength * index);
    listRef.current?.scrollToOffset({
      offset: estimatedOffset,
      animated: false,
    });
  }

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

  function openRoster() {
    setRosterOpen(true);
    onOpenMembers();
  }

  async function handleSelectMember(member: GroupMember) {
    setProfileMember(member);
    setProfileNote(null);
    setIsLoadingNote(true);
    try {
      const note = await onLoadMemberNote(member.accountId);
      setProfileNote(note);
    } finally {
      setIsLoadingNote(false);
    }
  }

  async function handleSaveMemberNote(note: string) {
    if (!profileMember) return;
    setIsSavingNote(true);
    try {
      await onSaveMemberNote(profileMember.accountId, note);
      setProfileNote(note);
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleOpenDm() {
    if (!profileMember) return;
    await onOpenDm(profileMember.accountId, profileMember.displayName);
    setProfileMember(null);
    setRosterOpen(false);
  }

  function handleSendContactRequest() {
    if (!profileMember) return;
    onSendContactRequest(profileMember.accountId, profileMember.displayName);
    setProfileMember(null);
    setRosterOpen(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.conversationShell}
      // iOS: "padding" keeps the composer above the keyboard.
      // Android: the app-level shell handles IME avoidance. On recent
      // edge-to-edge Android builds the activity remains full height even with
      // adjustResize, so keeping this local KAV inert avoids double movement.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.conversationTopBar}>
        {showBackButton ? (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>Chats</Text>
          </Pressable>
        ) : null}

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
          <Pressable
            onPress={openSettings}
            style={styles.conversationOverflowButton}
          >
            <Text style={styles.conversationOverflowLabel}>More</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={openRoster}
          style={styles.conversationOverflowButton}
        >
          <Text style={styles.conversationOverflowLabel}>People</Text>
        </Pressable>
      </View>

      {isLoadingThread ? (
        <View
          style={[styles.conversationMessages, styles.conversationLoadingState]}
        >
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
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={handleConversationScroll}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          scrollEventThrottle={16}
          viewabilityConfig={viewabilityConfigRef.current}
          renderItem={({ item }) =>
            item.type === "date" ? (
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorLabel}>{item.label}</Text>
              </View>
            ) : (
              <MessageBubble
                message={item.message}
                isOwnMessage={
                  item.message.senderAccountId === session.accountId
                }
                onImageError={onImageError}
                onResolveAttachmentAccess={onResolveAttachmentAccess}
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
              <Text style={styles.infoTitle}>
                {pendingAttachmentView?.title ?? "Attachment ready"}
              </Text>
              <Pressable onPress={() => setPendingAttachment(null)}>
                <Text style={styles.inlineAction}>Remove</Text>
              </Pressable>
            </View>
            {pendingAttachmentView?.isImage ? (
              <Image
                source={{ uri: pendingAttachment.uri }}
                style={styles.pendingAttachmentImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.pendingAttachmentImage,
                  {
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  },
                ]}
              >
                <Text style={{ fontSize: 30 }}>
                  {pendingAttachmentView?.icon ?? "📄"}
                </Text>
                <Text style={styles.infoTitle}>
                  {pendingAttachmentView?.previewLabel ?? "Attachment attached"}
                </Text>
              </View>
            )}
            <Text style={styles.helper}>
              {pendingAttachment.fileName} ·{" "}
              {formatBytes(pendingAttachment.byteLength || 0)}
            </Text>
          </View>
        ) : null}

        <View style={styles.composerDock}>
          {!editingMessageId ? (
            <Pressable
              style={[
                styles.composerIconButton,
                isPickingPhoto ? styles.composerIconButtonDisabled : null,
              ]}
              onPress={() => setAttachMenuOpen(true)}
              disabled={isPickingPhoto}
            >
              <Text style={styles.composerIconLabel}>＋</Text>
            </Pressable>
          ) : null}

          <TextInput
            multiline
            autoCorrect
            spellCheck
            placeholder={editingMessageId ? "Edit message…" : "Message…"}
            placeholderTextColor={theme.colors.placeholder}
            style={[styles.input, styles.composerInputDocked]}
            value={messageDraft}
            onChangeText={setMessageDraft}
          />

          <Pressable
            style={[
              styles.composerSendCircle,
              sendDisabled ? styles.composerSendCircleDisabled : null,
            ]}
            onPress={onSendMessage}
            disabled={sendDisabled}
          >
            <Text style={styles.composerSendIcon}>
              {isSendingMessage ? "…" : editingMessageId ? "✓" : "↑"}
            </Text>
          </Pressable>
        </View>
      </View>

      <AttachMenuSheet
        visible={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onSelect={(action: AttachMenuAction) => {
          switch (action) {
            case "camera":
              onTakePhoto();
              break;
            case "gallery":
              onPickPhoto();
              break;
            case "file":
              onPickFile();
              break;
            case "location":
              setLocationPickerOpen(true);
              break;
            case "poll":
              setPollCreatorOpen(true);
              break;
            case "checklist":
              setChecklistCreatorOpen(true);
              break;
          }
        }}
      />

      <LocationPickerSheet
        visible={locationPickerOpen}
        isLocating={isLocating}
        onClose={() => setLocationPickerOpen(false)}
        onPick={(choice) => {
          setIsLocating(true);
          setLocationPickerOpen(false);
          onPickLocation(choice);
          // isLocating resets in the parent after the async op
          setTimeout(() => setIsLocating(false), 15_000);
        }}
      />

      <PollCreatorSheet
        visible={pollCreatorOpen}
        onClose={() => setPollCreatorOpen(false)}
        onSend={onSendRawText}
      />

      <ChecklistCreatorSheet
        visible={checklistCreatorOpen}
        onClose={() => setChecklistCreatorOpen(false)}
        onSend={onSendRawText}
      />

      <Modal
        visible={settingsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSettingsOpen(false)}
        >
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
                  {settingsSensitive ? (
                    <Text style={styles.checkboxMark}>✓</Text>
                  ) : null}
                </View>
                <View style={styles.checkboxCopy}>
                  <Text style={styles.label}>Sensitive media defaults</Text>
                  <Text style={styles.helper}>
                    New members start with blur enabled.
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {settingsError ? (
              <Text style={styles.errorText}>{settingsError}</Text>
            ) : null}

            {selectedGroup.canManageMembers ? (
              <Pressable
                style={[
                  styles.primaryButton,
                  isSavingSettings ? styles.primaryButtonDisabled : null,
                ]}
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
                  style={[
                    styles.secondaryButton,
                    isCreatingInvite ? styles.primaryButtonDisabled : null,
                  ]}
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

      {rosterOpen ? (
        <MemberRosterModal
          members={groupMembers}
          isLoading={isLoadingMembers}
          myAccountId={session.accountId}
          onSelectMember={handleSelectMember}
          onClose={() => setRosterOpen(false)}
        />
      ) : null}

      {profileMember ? (
        <MemberProfileSheet
          member={profileMember}
          isSelf={profileMember.accountId === session.accountId}
          threadMessages={threadMessages}
          privateNote={isLoadingNote ? null : profileNote}
          isSavingNote={isSavingNote}
          isOpeningDm={isOpeningDm}
          onClose={() => setProfileMember(null)}
          onSaveNote={handleSaveMemberNote}
          onOpenDm={handleOpenDm}
          onSendContactRequest={handleSendContactRequest}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}
