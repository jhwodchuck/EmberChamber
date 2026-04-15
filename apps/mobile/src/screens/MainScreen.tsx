import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import type {
  AuthSession,
  ContactCard,
  ConversationPreference,
  FormMessage,
  GroupInvitePreview,
  GroupInviteRecord,
  GroupMember,
  GroupMembershipSummary,
  GroupThreadMessage,
  MeProfile,
  PendingAttachment,
  PrivacyDefaults,
  SessionDescriptor,
} from "../types";
import type { ContextMenuAction } from "../components/MessageContextMenu";
import { styles } from "../styles";
import { StatusCard } from "../components/StatusCard";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import {
  ChatListScreen,
  type ChatListItem,
} from "./ChatListScreen";
import { ConversationScreen } from "./ConversationScreen";
import { InvitesScreen } from "./InvitesScreen";
import { SettingsScreen } from "./SettingsScreen";
import type { PersistedMainShellState } from "../lib/mainShell";
import type { ChatListFilter, MainChatView, MainTab } from "../lib/mainShell";

export type MainScreenProps = {
  session: AuthSession;
  profile: MeProfile | null;
  contactCard: ContactCard | null;
  groups: GroupMembershipSummary[];
  conversationPreviews: Record<string, GroupThreadMessage | null>;
  conversationPreferences: Record<string, ConversationPreference>;
  unreadCounts: Record<string, number>;
  inviteFocusToken: number;
  selectedConversationId: string | null;
  setSelectedConversationId: Dispatch<SetStateAction<string | null>>;
  selectedGroup: GroupMembershipSummary | null;
  threadMessages: GroupThreadMessage[];
  inviteInput: string;
  setInviteInput: Dispatch<SetStateAction<string>>;
  invitePreview: GroupInvitePreview | null;
  invitePreviewError: string | null;
  messageDraft: string;
  setMessageDraft: Dispatch<SetStateAction<string>>;
  pendingAttachment: PendingAttachment | null;
  setPendingAttachment: Dispatch<SetStateAction<PendingAttachment | null>>;
  isLoadingAccount: boolean;
  isLoadingThread: boolean;
  isPreviewingInvite: boolean;
  isAcceptingInvite: boolean;
  isPickingPhoto: boolean;
  isSendingMessage: boolean;
  deviceBundleReady: boolean;
  deviceBundleCount: number;
  deviceBundleError: string | null;
  vaultCount: number;
  privacyDefaults: PrivacyDefaults;
  sessionMessage: FormMessage | null;
  email: string;
  deviceLabel: string;
  deviceLinkQrValue: string | null;
  deviceLinkStatus: DeviceLinkStatus | null;
  deviceLinkMessage: FormMessage | null;
  isWorkingDeviceLink: boolean;
  isApprovingDeviceLink: boolean;
  sessions: SessionDescriptor[];
  isLoadingSessions: boolean;
  sessionsError: string | null;
  onRefreshSessions: () => void;
  onSignOut: () => void;
  onShowDeviceLinkQr: () => void;
  onScanDeviceLinkQr: (payload: string) => void | Promise<void>;
  onApproveDeviceLink: () => void;
  onResetDeviceLink: () => void;
  onPreviewInvite: () => void;
  onAcceptInvite: () => void;
  onPickPhoto: () => void;
  onTakePhoto: () => void;
  onPickFile: () => void;
  onPickLocation: (choice: import("../components/LocationPickerSheet").LocationChoice) => void;
  onSendRawText: (text: string) => void;
  onSendMessage: () => void;
  onUpdatePrivacy: <K extends keyof PrivacyDefaults>(key: K, value: PrivacyDefaults[K]) => void;
  onImageError: (messageId: string) => void;
  onResolveAttachmentAccess?: (
    messageId: string,
    attachment: NonNullable<GroupThreadMessage["attachment"]>,
  ) => Promise<NonNullable<GroupThreadMessage["attachment"]> | null>;
  editingMessageId: string | null;
  onCancelEdit: () => void;
  onMessageAction: (messageId: string, action: ContextMenuAction) => void;
  onUpdateGroup: (title: string, sensitiveMedia: boolean) => Promise<void>;
  onCreateInvite: () => Promise<GroupInviteRecord | null>;
  isUploadingAvatar: boolean;
  onChangeAvatar: () => void;
  unreadIds: Set<string>;
  onToggleConversationArchived: (conversationId: string) => void;
  onToggleConversationPinned: (conversationId: string) => void;
  onToggleConversationMuted: (conversationId: string) => void;
  // member roster
  groupMembers: GroupMember[];
  isLoadingMembers: boolean;
  isOpeningDm: boolean;
  onOpenMembers: () => void;
  onLoadMemberNote: (accountId: string) => Promise<string | null>;
  onSaveMemberNote: (accountId: string, note: string) => Promise<void>;
  onOpenDm: (targetAccountId: string, displayName: string) => Promise<void>;
  onSendContactRequest: (targetAccountId: string, displayName: string) => void;
  initialShellState: PersistedMainShellState;
  onPersistShellState: (state: PersistedMainShellState) => void;
  restoredConversationAnchorId: string | null;
  onPersistConversationAnchor: (conversationId: string, messageId: string | null) => void;
};

export function MainScreen(props: MainScreenProps) {
  const {
    session,
    profile,
    contactCard,
    groups,
    conversationPreviews,
    conversationPreferences,
    unreadCounts,
    inviteFocusToken,
    selectedConversationId,
    setSelectedConversationId,
    selectedGroup,
    threadMessages,
    inviteInput,
    setInviteInput,
    invitePreview,
    invitePreviewError,
    messageDraft,
    setMessageDraft,
    pendingAttachment,
    setPendingAttachment,
    isLoadingAccount,
    isLoadingThread,
    isPreviewingInvite,
    isAcceptingInvite,
    isPickingPhoto,
    isSendingMessage,
    deviceBundleReady,
    deviceBundleCount,
    deviceBundleError,
    vaultCount,
    privacyDefaults,
    sessionMessage,
    email,
    deviceLabel,
    deviceLinkQrValue,
    deviceLinkStatus,
    deviceLinkMessage,
    isWorkingDeviceLink,
    isApprovingDeviceLink,
    sessions,
    isLoadingSessions,
    sessionsError,
    onRefreshSessions,
    onSignOut,
    onShowDeviceLinkQr,
    onScanDeviceLinkQr,
    onApproveDeviceLink,
    onResetDeviceLink,
    onPreviewInvite,
    onAcceptInvite,
    onPickPhoto,
    onTakePhoto,
    onPickFile,
    onPickLocation,
    onSendRawText,
    onSendMessage,
    onUpdatePrivacy,
    onImageError,
    onResolveAttachmentAccess,
    editingMessageId,
    onCancelEdit,
    onMessageAction,
    onUpdateGroup,
    onCreateInvite,
    isUploadingAvatar,
    onChangeAvatar,
    unreadIds,
    onToggleConversationArchived,
    onToggleConversationPinned,
    onToggleConversationMuted,
    groupMembers,
    isLoadingMembers,
    isOpeningDm,
    onOpenMembers,
    onLoadMemberNote,
    onSaveMemberNote,
    onOpenDm,
    onSendContactRequest,
    initialShellState,
    onPersistShellState,
    restoredConversationAnchorId,
    onPersistConversationAnchor,
  } = props;

  const { width } = useWindowDimensions();
  const isWideChatsLayout = width >= 980;
  const [activeTab, setActiveTab] = useState<MainTab>(initialShellState.activeTab);
  const [chatView, setChatView] = useState<MainChatView>(initialShellState.chatView);

  // On narrow layouts the tab bar is a flex sibling of appBody. When Android's
  // resize mode shrinks the window for the keyboard, the tab bar's fixed height
  // (~80 px including gap and shell padding) eats space that the conversation
  // composer needs. Hide it while a conversation fills the screen.
  const isNarrowConversation =
    !isWideChatsLayout &&
    activeTab === "chats" &&
    chatView === "conversation" &&
    !!selectedGroup;
  const [chatFilter, setChatFilter] = useState<ChatListFilter>(initialShellState.chatFilter);
  const [chatSearch, setChatSearch] = useState("");

  useEffect(() => {
    if (!selectedGroup) {
      setChatView("list");
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (inviteFocusToken === 0) {
      return;
    }

    setActiveTab("invites");
    setChatView("list");
  }, [inviteFocusToken]);

  useEffect(() => {
    onPersistShellState({
      activeTab,
      chatView,
      chatFilter,
    });
  }, [activeTab, chatFilter, chatView, onPersistShellState]);

  const chatItems = useMemo<ChatListItem[]>(() => {
    const normalizedSearch = chatSearch.trim().toLowerCase();

    return groups
      .map((group) => ({
        group,
        latestMessage: conversationPreviews[group.id] ?? null,
        preference:
          conversationPreferences[group.id] ?? {
            conversationId: group.id,
            isArchived: false,
            isPinned: false,
            isMuted: false,
            lastReadAt: null,
          },
        unreadCount: unreadCounts[group.id] ?? 0,
      }))
      .filter(({ group, preference, unreadCount }) => {
        if (chatFilter === "unread" && unreadCount < 1) {
          return false;
        }

        if (chatFilter === "pinned" && !preference.isPinned) {
          return false;
        }

        if (chatFilter === "archived" && !preference.isArchived) {
          return false;
        }

        if (chatFilter !== "archived" && preference.isArchived) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return group.title.toLowerCase().includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (left.preference.isPinned !== right.preference.isPinned) {
          return left.preference.isPinned ? -1 : 1;
        }

        const leftTimestamp = left.latestMessage?.createdAt ?? left.group.updatedAt;
        const rightTimestamp = right.latestMessage?.createdAt ?? right.group.updatedAt;
        return rightTimestamp.localeCompare(leftTimestamp);
      });
  }, [chatFilter, chatSearch, conversationPreferences, conversationPreviews, groups, unreadCounts]);

  function openConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setPendingAttachment(null);
    setActiveTab("chats");
    setChatView("conversation");
  }

  const chatListPane = (
    <ChatListScreen
      profileName={profile?.displayName ?? null}
      selectedConversationId={selectedConversationId}
      items={chatItems}
      activeFilter={chatFilter}
      onChangeFilter={setChatFilter}
      searchQuery={chatSearch}
      onChangeSearchQuery={setChatSearch}
      isLoadingAccount={isLoadingAccount}
      unreadIds={unreadIds}
      onSelectConversation={openConversation}
      onToggleConversationArchived={onToggleConversationArchived}
      onToggleConversationPinned={onToggleConversationPinned}
      onToggleConversationMuted={onToggleConversationMuted}
      onOpenInvites={() => setActiveTab("invites")}
    />
  );

  const conversationPane = selectedGroup ? (
    <ConversationScreen
      session={session}
      selectedGroup={selectedGroup}
      threadMessages={threadMessages}
      messageDraft={messageDraft}
      setMessageDraft={setMessageDraft}
      pendingAttachment={pendingAttachment}
      setPendingAttachment={setPendingAttachment}
      isLoadingThread={isLoadingThread}
      isPickingPhoto={isPickingPhoto}
      isSendingMessage={isSendingMessage}
      editingMessageId={editingMessageId}
      onCancelEdit={onCancelEdit}
      onTakePhoto={onTakePhoto}
      onPickPhoto={onPickPhoto}
      onPickFile={onPickFile}
      onPickLocation={onPickLocation}
      onSendRawText={onSendRawText}
      onSendMessage={onSendMessage}
      onBack={() => setChatView("list")}
      showBackButton={!isWideChatsLayout}
      restoredAnchorMessageId={restoredConversationAnchorId}
      onAnchorMessageChange={(messageId) =>
        onPersistConversationAnchor(selectedGroup.id, messageId)
      }
      onImageError={onImageError}
      onResolveAttachmentAccess={onResolveAttachmentAccess}
      onMessageAction={onMessageAction}
      onUpdateGroup={onUpdateGroup}
      onCreateInvite={onCreateInvite}
      groupMembers={groupMembers}
      isLoadingMembers={isLoadingMembers}
      isOpeningDm={isOpeningDm}
      onOpenMembers={onOpenMembers}
      onLoadMemberNote={onLoadMemberNote}
      onSaveMemberNote={onSaveMemberNote}
      onOpenDm={onOpenDm}
      onSendContactRequest={onSendContactRequest}
    />
  ) : (
    <View style={styles.chatWorkspaceEmptyPane}>
      <Text style={styles.chatWorkspaceEmptyTitle}>Pick a circle</Text>
      <Text style={styles.chatWorkspaceEmptyBody}>
        The list stays visible here on larger screens, so the conversation pane can hold your
        place instead of replacing the inbox.
      </Text>
    </View>
  );

  const content =
    activeTab === "chats" ? (
      isWideChatsLayout ? (
        <View style={styles.chatWorkspaceShell}>
          <View style={styles.chatWorkspaceListPane}>{chatListPane}</View>
          <View style={styles.chatWorkspaceDetailPane}>{conversationPane}</View>
        </View>
      ) : chatView === "conversation" && selectedGroup ? (
        conversationPane
      ) : (
        chatListPane
      )
    ) : activeTab === "invites" ? (
      <InvitesScreen
        inviteInput={inviteInput}
        setInviteInput={setInviteInput}
        invitePreview={invitePreview}
        invitePreviewError={invitePreviewError}
        isPreviewingInvite={isPreviewingInvite}
        isAcceptingInvite={isAcceptingInvite}
        groupCount={groups.length}
        onPreviewInvite={onPreviewInvite}
        onAcceptInvite={onAcceptInvite}
        onOpenChats={() => setActiveTab("chats")}
      />
    ) : (
      <SettingsScreen
        isLoadingAccount={isLoadingAccount}
        profile={profile}
        contactCard={contactCard}
        email={email}
        deviceLabel={deviceLabel}
        deviceBundleReady={deviceBundleReady}
        deviceBundleCount={deviceBundleCount}
        deviceBundleError={deviceBundleError}
        vaultCount={vaultCount}
        privacyDefaults={privacyDefaults}
        deviceLinkQrValue={deviceLinkQrValue}
        deviceLinkStatus={deviceLinkStatus}
        deviceLinkMessage={deviceLinkMessage}
        isWorkingDeviceLink={isWorkingDeviceLink}
        isApprovingDeviceLink={isApprovingDeviceLink}
        sessions={sessions}
        isLoadingSessions={isLoadingSessions}
        sessionsError={sessionsError}
        onRefreshSessions={onRefreshSessions}
        isUploadingAvatar={isUploadingAvatar}
        onShowDeviceLinkQr={onShowDeviceLinkQr}
        onScanDeviceLinkQr={onScanDeviceLinkQr}
        onApproveDeviceLink={onApproveDeviceLink}
        onResetDeviceLink={onResetDeviceLink}
        onUpdatePrivacy={onUpdatePrivacy}
        onChangeAvatar={onChangeAvatar}
        onSignOut={onSignOut}
      />
    );

  return (
    <View style={styles.appShell}>
      {sessionMessage ? (
        <View style={styles.shellBanner}>
          <StatusCard {...sessionMessage} />
        </View>
      ) : null}

      <View style={styles.appBody}>{content}</View>

      {!isNarrowConversation ? (
        <View style={styles.appTabBar}>
          {([
            ["chats", "Chats"],
            ["invites", "Invites"],
            ["settings", "Settings"],
          ] as const).map(([tab, label]) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.appTabButton,
                activeTab === tab ? styles.appTabButtonActive : null,
              ]}
            >
              <Text
                style={[
                  styles.appTabLabel,
                  activeTab === tab ? styles.appTabLabelActive : null,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
