import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, View } from "react-native";
import type {
  AuthSession,
  ContactCard,
  ConversationPreference,
  FormMessage,
  GroupInvitePreview,
  GroupInviteRecord,
  GroupMembershipSummary,
  GroupThreadMessage,
  MeProfile,
  PendingAttachment,
  PrivacyDefaults,
} from "../types";
import type { ContextMenuAction } from "../components/MessageContextMenu";
import { styles } from "../styles";
import { StatusCard } from "../components/StatusCard";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import {
  ChatListScreen,
  type ChatListFilter,
  type ChatListItem,
} from "./ChatListScreen";
import { ConversationScreen } from "./ConversationScreen";
import { InvitesScreen } from "./InvitesScreen";
import { SettingsScreen } from "./SettingsScreen";

export type MainScreenProps = {
  session: AuthSession;
  profile: MeProfile | null;
  contactCard: ContactCard | null;
  groups: GroupMembershipSummary[];
  conversationPreviews: Record<string, GroupThreadMessage | null>;
  conversationPreferences: Record<string, ConversationPreference>;
  unreadCounts: Record<string, number>;
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
  onSignOut: () => void;
  onShowDeviceLinkQr: () => void;
  onScanDeviceLinkQr: (payload: string) => void | Promise<void>;
  onApproveDeviceLink: () => void;
  onResetDeviceLink: () => void;
  onPreviewInvite: () => void;
  onAcceptInvite: () => void;
  onPickPhoto: () => void;
  onTakePhoto: () => void;
  onSendMessage: () => void;
  onUpdatePrivacy: <K extends keyof PrivacyDefaults>(key: K, value: PrivacyDefaults[K]) => void;
  onImageError: (messageId: string) => void;
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
};

type MainTab = "chats" | "invites" | "settings";

export function MainScreen(props: MainScreenProps) {
  const {
    session,
    profile,
    contactCard,
    groups,
    conversationPreviews,
    conversationPreferences,
    unreadCounts,
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
    onSignOut,
    onShowDeviceLinkQr,
    onScanDeviceLinkQr,
    onApproveDeviceLink,
    onResetDeviceLink,
    onPreviewInvite,
    onAcceptInvite,
    onPickPhoto,
    onTakePhoto,
    onSendMessage,
    onUpdatePrivacy,
    onImageError,
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
  } = props;

  const [activeTab, setActiveTab] = useState<MainTab>("chats");
  const [chatView, setChatView] = useState<"list" | "conversation">("list");
  const [chatFilter, setChatFilter] = useState<ChatListFilter>("all");
  const [chatSearch, setChatSearch] = useState("");

  useEffect(() => {
    if (!selectedGroup) {
      setChatView("list");
    }
  }, [selectedGroup]);

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

  const content =
    activeTab === "chats" ? (
      chatView === "conversation" && selectedGroup ? (
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
          onSendMessage={onSendMessage}
          onBack={() => setChatView("list")}
          onImageError={onImageError}
          onMessageAction={onMessageAction}
          onUpdateGroup={onUpdateGroup}
          onCreateInvite={onCreateInvite}
        />
      ) : (
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
    </View>
  );
}
