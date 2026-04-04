import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  ConversationPreference,
  GroupMembershipSummary,
  GroupThreadMessage,
} from "../types";
import { styles, theme } from "../styles";

const CHAT_ACTION_WIDTH = 216;

export type ChatListFilter = "all" | "unread" | "pinned" | "archived";

export type ChatListItem = {
  group: GroupMembershipSummary;
  latestMessage: GroupThreadMessage | null;
  preference: ConversationPreference;
  unreadCount: number;
};

const chatFilters: ChatListFilter[] = ["all", "unread", "pinned", "archived"];

function formatTimestamp(value: string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();

  if (sameDay) {
    return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function previewText(group: GroupMembershipSummary, message: GroupThreadMessage | null) {
  if (!message) {
    return group.historyMode === "device_encrypted" ? "Encrypted chat" : "No messages yet";
  }

  if (message.kind === "system_notice") {
    return message.text ?? "Update";
  }

  const attachmentLabel =
    message.attachment?.contentClass === "image"
      ? "Photo"
      : message.attachment?.fileName ?? "Attachment";

  if (message.text?.trim()) {
    return message.attachment ? `${attachmentLabel}: ${message.text.trim()}` : message.text.trim();
  }

  return message.attachment ? attachmentLabel : "New message";
}

function groupInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || "#";
}

function unreadBadgeLabel(unreadCount: number) {
  if (unreadCount > 99) {
    return "99+";
  }

  return `${unreadCount}`;
}

type SwipeableChatRowProps = {
  item: ChatListItem;
  isSelected: boolean;
  isOpen: boolean;
  isUnread: boolean;
  onSetOpen: (conversationId: string | null) => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleConversationArchived: (conversationId: string) => void;
  onToggleConversationPinned: (conversationId: string) => void;
  onToggleConversationMuted: (conversationId: string) => void;
};

function SwipeableChatRow({
  item,
  isSelected,
  isOpen,
  isUnread,
  onSetOpen,
  onSelectConversation,
  onToggleConversationArchived,
  onToggleConversationPinned,
  onToggleConversationMuted,
}: SwipeableChatRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: isOpen ? -CHAT_ACTION_WIDTH : 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [isOpen, translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 6,
        onPanResponderMove: (_event, gestureState) => {
          const baseOffset = isOpen ? -CHAT_ACTION_WIDTH : 0;
          const nextOffset = Math.max(-CHAT_ACTION_WIDTH, Math.min(0, baseOffset + gestureState.dx));
          translateX.setValue(nextOffset);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const shouldOpen = isOpen
            ? gestureState.dx < 28
            : gestureState.dx < -42;
          onSetOpen(shouldOpen ? item.group.id : null);
        },
        onPanResponderTerminate: () => {
          onSetOpen(isOpen ? item.group.id : null);
        },
      }),
    [isOpen, item.group.id, onSetOpen, translateX],
  );

  function handleRowPress() {
    if (isOpen) {
      onSetOpen(null);
      return;
    }

    onSelectConversation(item.group.id);
  }

  function runAction(action: () => void) {
    onSetOpen(null);
    action();
  }

  return (
    <View style={styles.chatRowShell}>
      <View style={styles.chatRowActions}>
        <Pressable
          style={[styles.chatActionButton, styles.chatActionButtonMuted]}
          onPress={() =>
            runAction(() => onToggleConversationMuted(item.group.id))
          }
        >
          <Text style={styles.chatActionLabel}>
            {item.preference.isMuted ? "Alerts" : "Mute"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.chatActionButton, styles.chatActionButtonPinned]}
          onPress={() =>
            runAction(() => onToggleConversationPinned(item.group.id))
          }
        >
          <Text style={styles.chatActionLabel}>
            {item.preference.isPinned ? "Unpin" : "Pin"}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.chatActionButton, styles.chatActionButtonArchived]}
          onPress={() =>
            runAction(() => onToggleConversationArchived(item.group.id))
          }
        >
          <Text style={styles.chatActionLabel}>
            {item.preference.isArchived ? "Keep" : "Archive"}
          </Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.chatRowAnimated,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={handleRowPress}
          onLongPress={() => onSetOpen(isOpen ? null : item.group.id)}
          android_ripple={{ color: "rgba(255, 255, 255, 0.06)" }}
          style={[
            styles.chatRow,
            isSelected ? styles.chatRowActive : null,
          ]}
        >
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{groupInitial(item.group.title)}</Text>
          </View>

          <View style={styles.chatRowCopy}>
            <View style={styles.chatRowTop}>
              <Text
                style={[
                  styles.chatRowTitle,
                  isUnread ? styles.chatRowTitleUnread : null,
                ]}
                numberOfLines={1}
              >
                {item.group.title}
              </Text>

              <View style={styles.chatRowRight}>
                <Text
                  style={[
                    styles.chatRowTime,
                    isUnread ? styles.chatRowTimeUnread : null,
                  ]}
                >
                  {formatTimestamp(item.latestMessage?.createdAt ?? item.group.updatedAt)}
                </Text>
                {item.preference.isPinned ? (
                  <Text style={styles.chatStateLabel}>PIN</Text>
                ) : null}
                {item.preference.isMuted ? (
                  <Text style={styles.chatStateLabel}>MUTE</Text>
                ) : null}
                {item.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadBadgeLabel(item.unreadCount)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Text
              style={[
                styles.chatRowPreview,
                isUnread ? styles.chatRowPreviewUnread : null,
              ]}
              numberOfLines={1}
            >
              {previewText(item.group, item.latestMessage)}
            </Text>

            <View style={styles.chatMetaRow}>
              {item.group.historyMode === "device_encrypted" ? (
                <Text style={styles.chatRowMeta}>Locked</Text>
              ) : null}
              {item.group.sensitiveMediaDefault ? (
                <Text style={styles.chatRowMeta}>Sensitive</Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export type ChatListScreenProps = {
  profileName: string | null;
  selectedConversationId: string | null;
  items: ChatListItem[];
  activeFilter: ChatListFilter;
  onChangeFilter: (value: ChatListFilter) => void;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  isLoadingAccount: boolean;
  unreadIds: Set<string>;
  onSelectConversation: (conversationId: string) => void;
  onToggleConversationArchived: (conversationId: string) => void;
  onToggleConversationPinned: (conversationId: string) => void;
  onToggleConversationMuted: (conversationId: string) => void;
  onOpenInvites: () => void;
};

export function ChatListScreen({
  profileName,
  selectedConversationId,
  items,
  activeFilter,
  onChangeFilter,
  searchQuery,
  onChangeSearchQuery,
  isLoadingAccount,
  unreadIds,
  onSelectConversation,
  onToggleConversationArchived,
  onToggleConversationPinned,
  onToggleConversationMuted,
  onOpenInvites,
}: ChatListScreenProps) {
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const resumeItem = items[0] ?? null;

  useEffect(() => {
    if (!items.some((item) => item.group.id === openConversationId)) {
      setOpenConversationId(null);
    }
  }, [items, openConversationId]);

  return (
    <View style={styles.screenSection}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Chats</Text>
        <Text style={styles.screenSubtitle}>
          {profileName ? `${profileName}'s circles` : "Your circles"}
        </Text>
      </View>

      {resumeItem ? (
        <Pressable
          style={styles.resumeCard}
          onPress={() => onSelectConversation(resumeItem.group.id)}
        >
          <View style={styles.resumeHeader}>
            <Text style={styles.resumeEyebrow}>Resume thread</Text>
            <Text style={styles.resumeTimestamp}>
              {formatTimestamp(resumeItem.latestMessage?.createdAt ?? resumeItem.group.updatedAt)}
            </Text>
          </View>
          <Text style={styles.resumeTitle} numberOfLines={1}>
            {resumeItem.group.title}
          </Text>
          <Text style={styles.resumePreview} numberOfLines={2}>
            {previewText(resumeItem.group, resumeItem.latestMessage)}
          </Text>
          <View style={styles.resumeFooter}>
            <Text style={styles.resumeAction}>Continue</Text>
            {resumeItem.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadBadgeLabel(resumeItem.unreadCount)}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ) : (
        <Pressable style={styles.resumeEmptyCard} onPress={onOpenInvites}>
          <Text style={styles.resumeEmptyTitle}>Start your first trusted circle</Text>
          <Text style={styles.resumeEmptyBody}>
            Open invites to join a circle and begin chatting.
          </Text>
          <Text style={styles.resumeAction}>Open invites</Text>
        </Pressable>
      )}

      <TextInput
        placeholder="Search"
        placeholderTextColor={theme.colors.placeholder}
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
      />

      <View style={styles.filterRow}>
        {chatFilters.map((filter) => (
          <Pressable
            key={filter}
            onPress={() => onChangeFilter(filter)}
            style={[
              styles.filterChip,
              activeFilter === filter ? styles.filterChipActive : null,
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                activeFilter === filter ? styles.filterLabelActive : null,
              ]}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoadingAccount && !items.length ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={theme.colors.textSoft} />
          <Text style={styles.emptyStateTitle}>Loading chats</Text>
        </View>
      ) : null}

      <ScrollView style={styles.screenScroll} contentContainerStyle={styles.chatListContent}>
        {!isLoadingAccount && !items.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No chats</Text>
            <Text style={styles.emptyStateBody}>Use an invite to start.</Text>
            <Pressable style={styles.secondaryButton} onPress={onOpenInvites}>
              <Text style={styles.secondaryButtonLabel}>Open invites</Text>
            </Pressable>
          </View>
        ) : null}

        {items.map((item) => (
          <SwipeableChatRow
            key={item.group.id}
            item={item}
            isSelected={selectedConversationId === item.group.id}
            isOpen={openConversationId === item.group.id}
            isUnread={unreadIds.has(item.group.id)}
            onSetOpen={setOpenConversationId}
            onSelectConversation={onSelectConversation}
            onToggleConversationArchived={onToggleConversationArchived}
            onToggleConversationPinned={onToggleConversationPinned}
            onToggleConversationMuted={onToggleConversationMuted}
          />
        ))}
      </ScrollView>
    </View>
  );
}
