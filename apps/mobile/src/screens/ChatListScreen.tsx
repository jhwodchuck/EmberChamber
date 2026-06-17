import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { FlashList } from "@shopify/flash-list";
import type {
  CommunityListEntry,
  ConversationPreference,
  GroupMembershipSummary,
  GroupThreadMessage,
} from "../types";
import { CHAT_LIST_FILTERS, type ChatListFilter } from "../lib/mainShell";
import { parseSharedLocation } from "../lib/utils";
import { haptics } from "../lib/haptics";
import { springs } from "../lib/motion";
import { styles as sharedStyles, theme } from "../styles";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { SkeletonChatRow } from "../components/Shimmer";
import { styles as scaffoldStyles } from "../components/screenScaffold.styles";
import { chatListScreenStyles } from "./chatListScreen.styles";

const styles = { ...sharedStyles, ...scaffoldStyles, ...chatListScreenStyles };

const CHAT_ACTION_WIDTH = 216;

// How many skeleton rows to show while the account is still loading. Enough to
// fill the visible list area without overflowing into needless work.
const SKELETON_ROW_COUNT = 6;

// Open/close decision thresholds, mirrored from the original PanResponder so the
// swipe feel is unchanged. When the row is closed it opens once the finger has
// dragged left past -42px; when it is open it stays open unless the finger has
// dragged right past +28px.
const OPEN_THRESHOLD = -42;
const CLOSE_THRESHOLD = 28;
// Horizontal travel before the pan should win over a vertical list scroll.
const ACTIVATION_DISTANCE = 6;

export type ChatListItem = {
  group: GroupMembershipSummary;
  latestMessage: GroupThreadMessage | null;
  preference: ConversationPreference;
  unreadCount: number;
};

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
    return parsed.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function previewText(
  group: GroupMembershipSummary,
  message: GroupThreadMessage | null,
) {
  if (!message) {
    return group.historyMode === "device_encrypted"
      ? "Encrypted chat"
      : "No messages yet";
  }

  if (message.kind === "system_notice") {
    return message.text ?? "Update";
  }

  if (message.deletedAt) {
    return "Message deleted";
  }

  const sharedLocation = message.text
    ? parseSharedLocation(message.text)
    : null;
  if (sharedLocation) {
    return sharedLocation.isLive ? "Live location" : "Shared location";
  }

  const attachmentLabel =
    message.attachment?.contentClass === "image"
      ? "Photo"
      : message.attachment?.contentClass === "video"
        ? "Video"
        : message.attachment?.contentClass === "audio"
          ? "Audio"
          : (message.attachment?.fileName ?? "Attachment");

  if (message.text?.trim()) {
    return message.attachment
      ? `${attachmentLabel}: ${message.text.trim()}`
      : message.text.trim();
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

const SwipeableChatRow = memo(function SwipeableChatRow({
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
  // `translateX` is the live position; `crossedOpen` tracks whether the gesture
  // is currently past the open/close decision point so a haptic fires exactly
  // once per threshold crossing (worklet-side, no JS round-trip per frame).
  const translateX = useSharedValue(isOpen ? -CHAT_ACTION_WIDTH : 0);
  const crossedOpen = useSharedValue(isOpen);

  // The `isOpen` prop is the source of truth (driven by single-open-row
  // coordination in the parent). Spring to match it whenever it changes —
  // this mirrors the previous `Animated.spring` effect.
  useEffect(() => {
    translateX.value = withSpring(
      isOpen ? -CHAT_ACTION_WIDTH : 0,
      springs.snappy,
    );
    crossedOpen.value = isOpen;
  }, [isOpen, translateX, crossedOpen]);

  const panGesture = useMemo(() => {
    const conversationId = item.group.id;

    return Gesture.Pan()
      .activeOffsetX([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
      .failOffsetY([-ACTIVATION_DISTANCE, ACTIVATION_DISTANCE])
      .onUpdate((event) => {
        "worklet";
        const baseOffset = isOpen ? -CHAT_ACTION_WIDTH : 0;
        const nextOffset = Math.max(
          -CHAT_ACTION_WIDTH,
          Math.min(0, baseOffset + event.translationX),
        );
        translateX.value = nextOffset;

        // Would the row end up open if released right now? Fire a selection tick
        // the moment that decision flips, in either direction.
        const wouldOpen = isOpen
          ? event.translationX < CLOSE_THRESHOLD
          : event.translationX < OPEN_THRESHOLD;
        if (wouldOpen !== crossedOpen.value) {
          crossedOpen.value = wouldOpen;
          runOnJS(haptics.selection)();
        }
      })
      .onEnd((event) => {
        "worklet";
        const shouldOpen = isOpen
          ? event.translationX < CLOSE_THRESHOLD
          : event.translationX < OPEN_THRESHOLD;
        runOnJS(onSetOpen)(shouldOpen ? conversationId : null);
      })
      .onFinalize(() => {
        "worklet";
        // If the gesture was interrupted without an end (terminate), settle back
        // to whatever the current open state is, matching the old terminate path.
        translateX.value = withSpring(
          isOpen ? -CHAT_ACTION_WIDTH : 0,
          springs.gentle,
        );
      });
  }, [isOpen, item.group.id, onSetOpen, translateX, crossedOpen]);

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.chatRowAnimated, animatedRowStyle]}>
          <Pressable
            onPress={handleRowPress}
            onLongPress={() => onSetOpen(isOpen ? null : item.group.id)}
            android_ripple={{ color: "rgba(255, 255, 255, 0.06)" }}
            style={[styles.chatRow, isSelected ? styles.chatRowActive : null]}
          >
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>
                {groupInitial(item.group.title)}
              </Text>
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
                    {formatTimestamp(
                      item.latestMessage?.createdAt ?? item.group.updatedAt,
                    )}
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
                  <Text style={styles.chatRowMeta}>Local-first</Text>
                ) : (
                  <Text style={styles.chatRowMeta}>Relay-hosted</Text>
                )}
                {item.group.sensitiveMediaDefault ? (
                  <Text style={styles.chatRowMeta}>Sensitive</Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

export type ChatListScreenProps = {
  profileName: string | null;
  selectedConversationId: string | null;
  items: ChatListItem[];
  communityItems?: CommunityListEntry[];
  activeFilter: ChatListFilter;
  onChangeFilter: (value: ChatListFilter) => void;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  isLoadingAccount: boolean;
  unreadIds: Set<string>;
  onSelectConversation: (conversationId: string) => void;
  onSelectCommunity?: (communityId: string) => void;
  onToggleConversationArchived: (conversationId: string) => void;
  onToggleConversationPinned: (conversationId: string) => void;
  onToggleConversationMuted: (conversationId: string) => void;
  onOpenInvites: () => void;
  onRefresh?: () => Promise<void>;
};

export function ChatListScreen({
  profileName,
  selectedConversationId,
  items,
  communityItems,
  activeFilter,
  onChangeFilter,
  searchQuery,
  onChangeSearchQuery,
  isLoadingAccount,
  unreadIds,
  onSelectConversation,
  onSelectCommunity,
  onToggleConversationArchived,
  onToggleConversationPinned,
  onToggleConversationMuted,
  onOpenInvites,
  onRefresh,
}: ChatListScreenProps) {
  const [openConversationId, setOpenConversationId] = useState<string | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) {
      return;
    }
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);
  const resumeItem = items[0] ?? null;

  const listExtraData = useMemo(
    () => ({ selectedConversationId, openConversationId }),
    [selectedConversationId, openConversationId],
  );

  const handleScrollBeginDrag = useCallback(() => {
    setOpenConversationId(null);
  }, []);

  const renderChatRow = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <SwipeableChatRow
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
    ),
    [
      selectedConversationId,
      openConversationId,
      unreadIds,
      onSelectConversation,
      onToggleConversationArchived,
      onToggleConversationPinned,
      onToggleConversationMuted,
    ],
  );

  useEffect(() => {
    if (!items.some((item) => item.group.id === openConversationId)) {
      setOpenConversationId(null);
    }
  }, [items, openConversationId]);

  return (
    <ScreenScaffold
      title="Chats"
      subtitle={profileName ? `${profileName}'s circles` : "Your circles"}
      headerAction={
        <Pressable
          style={styles.screenHeaderActionButton}
          onPress={onOpenInvites}
        >
          <Text style={styles.screenHeaderActionLabel}>Invites</Text>
        </Pressable>
      }
    >
      {resumeItem ? (
        <Pressable
          style={styles.resumeCard}
          onPress={() => onSelectConversation(resumeItem.group.id)}
        >
          <View style={styles.resumeHeader}>
            <Text style={styles.resumeEyebrow}>Resume thread</Text>
            <Text style={styles.resumeTimestamp}>
              {formatTimestamp(
                resumeItem.latestMessage?.createdAt ??
                  resumeItem.group.updatedAt,
              )}
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
          <Text style={styles.resumeEmptyTitle}>
            Start your first trusted circle
          </Text>
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
        {CHAT_LIST_FILTERS.map((filter) => (
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
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading chats"
          style={chatListScreenStyles.skeletonList}
        >
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
            <SkeletonChatRow key={index} />
          ))}
        </View>
      ) : null}

      <FlashList
        style={styles.screenScroll}
        contentContainerStyle={[
          styles.chatListContent,
          !items.length ? { flexGrow: 1 } : null,
        ]}
        data={items}
        keyExtractor={(item) => item.group.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraData={listExtraData}
        onScrollBeginDrag={handleScrollBeginDrag}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSoft}
              colors={[theme.colors.brand]}
              progressBackgroundColor={theme.colors.panel}
            />
          ) : undefined
        }
        renderItem={renderChatRow}
        ListEmptyComponent={
          !isLoadingAccount ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No chats</Text>
              <Text style={styles.emptyStateBody}>Use an invite to start.</Text>
              <Pressable style={styles.secondaryButton} onPress={onOpenInvites}>
                <Text style={styles.secondaryButtonLabel}>Open invites</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListFooterComponent={
          communityItems && communityItems.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Text
                style={[
                  styles.chatRowMeta,
                  {
                    marginHorizontal: 4,
                    marginBottom: 8,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  },
                ]}
              >
                Communities
              </Text>
              {communityItems.map((community) => (
                <Pressable
                  key={community.id}
                  style={[
                    chatListScreenStyles.chatRow,
                    { marginBottom: 4 },
                    selectedConversationId === community.id
                      ? chatListScreenStyles.chatRowActive
                      : null,
                  ]}
                  onPress={() => onSelectCommunity?.(community.id)}
                  android_ripple={{ color: "rgba(255,255,255,0.06)" }}
                >
                  <View style={chatListScreenStyles.chatAvatar}>
                    <Text style={chatListScreenStyles.chatAvatarText}>
                      {community.title.trim().charAt(0).toUpperCase() || "#"}
                    </Text>
                  </View>
                  <View style={chatListScreenStyles.chatRowCopy}>
                    <View style={chatListScreenStyles.chatRowTop}>
                      <Text
                        style={chatListScreenStyles.chatRowTitle}
                        numberOfLines={1}
                      >
                        {community.title}
                      </Text>
                    </View>
                    <Text style={chatListScreenStyles.chatRowPreview}>
                      {community.memberCount} members · {community.roomCount}{" "}
                      rooms
                    </Text>
                    <View style={chatListScreenStyles.chatMetaRow}>
                      <Text style={chatListScreenStyles.chatRowMeta}>
                        Community
                      </Text>
                      {community.inviteFreezeEnabled ? (
                        <Text style={chatListScreenStyles.chatRowMeta}>
                          Frozen
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null
        }
      />
    </ScreenScaffold>
  );
}
