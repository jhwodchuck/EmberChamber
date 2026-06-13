import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Clipboard,
  Image,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import {
  parseFormattedMessage,
  type FormattedBlockNode,
  type FormattedInlineNode,
} from "@emberchamber/shared";
import type { GroupThreadMessage } from "../types";
import { formatBytes, parseSharedLocation } from "../lib/utils";
import { styles, theme } from "../styles";
import { avatarColor, avatarInitial } from "../lib/avatarColor";
import { haptics } from "../lib/haptics";
import { springs, timings } from "../lib/motion";
import {
  bubbleStyles,
  REPLY_MAX_TRAVEL,
  REPLY_THRESHOLD,
} from "./messageBubble.styles";
import { ImageViewerModal } from "./ImageViewerModal";
import {
  MessageContextMenu,
  type ContextMenuAction,
} from "./MessageContextMenu";
import { useAttachmentManager } from "../hooks/useAttachmentManager";

// Delivery ticks: a first ✓ is always visible, and a second ✓ fades + slides in
// to settle into ✓✓ once the message has been read by at least one recipient.
const ReadTicks = memo(function ReadTicks({ read }: { read: boolean }) {
  const progress = useSharedValue(read ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(read ? 1 : 0, timings.base);
  }, [progress, read]);

  const secondTickStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: -2 + progress.value * 2 }],
  }));

  return (
    <View style={bubbleStyles.ticks}>
      <Text style={bubbleStyles.tick}>✓</Text>
      <Animated.Text
        style={[bubbleStyles.tick, bubbleStyles.tickSecond, secondTickStyle]}
      >
        ✓
      </Animated.Text>
    </View>
  );
});

// A single reaction chip that pops in with a bouncy spring on first appearance,
// re-pops whenever its count changes (someone toggled it), and gives a quick
// scale bounce + light haptic the moment it is tapped — before the toggle round
// trip — so the gesture feels instant.
const ReactionChip = memo(function ReactionChip({
  emoji,
  count,
  isActive,
  onToggle,
}: {
  emoji: string;
  count: number;
  isActive: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    // Re-pop when the count changes so toggles feel alive even after first mount.
    scale.value = withSequence(
      withTiming(1.18, timings.fast),
      withSpring(1, springs.bouncy),
    );
  }, [count, scale]);

  const handlePress = useCallback(() => {
    haptics.light();
    scale.value = withSequence(
      withTiming(0.86, timings.fast),
      withSpring(1, springs.bouncy),
    );
    onToggle();
  }, [onToggle, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={ZoomIn.springify().damping(12).stiffness(320)}>
      <Pressable onPress={handlePress}>
        <Animated.View
          style={[
            styles.messageReactionChip,
            isActive ? styles.messageReactionChipActive : null,
            animatedStyle,
          ]}
        >
          <Text style={styles.messageReactionText}>
            {emoji} {count}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

type InlineRenderOptions = {
  onOpenUrl: (url: string) => void;
  isSpoilerRevealed: (spoilerId: string) => boolean;
  onRevealSpoiler: (spoilerId: string) => void;
};

function renderInlineNode(
  node: FormattedInlineNode,
  key: string,
  options: InlineRenderOptions,
): ReactNode {
  switch (node.type) {
    case "text":
      return node.text;
    case "link":
      return (
        <Text
          key={key}
          style={styles.inlineLink}
          onPress={() => options.onOpenUrl(node.url)}
        >
          {node.text}
        </Text>
      );
    case "code":
      return (
        <Text key={key} style={styles.inlineCode}>
          {node.text}
        </Text>
      );
    case "mention":
      return (
        <Text key={key} style={styles.inlineMention}>
          {node.text}
        </Text>
      );
    case "spoiler":
      if (!options.isSpoilerRevealed(key)) {
        return (
          <Text
            key={key}
            style={styles.inlineSpoiler}
            suppressHighlighting
            onPress={() => options.onRevealSpoiler(key)}
          >
            Spoiler
          </Text>
        );
      }

      return (
        <Text key={key} style={styles.inlineSpoilerRevealed}>
          {renderInlineNodes(node.children, `${key}-spoiler`, options)}
        </Text>
      );
    case "bold":
      return (
        <Text key={key} style={styles.inlineBold}>
          {renderInlineNodes(node.children, `${key}-bold`, options)}
        </Text>
      );
    case "italic":
      return (
        <Text key={key} style={styles.inlineItalic}>
          {renderInlineNodes(node.children, `${key}-italic`, options)}
        </Text>
      );
    case "strikethrough":
      return (
        <Text key={key} style={styles.inlineStrikethrough}>
          {renderInlineNodes(node.children, `${key}-strike`, options)}
        </Text>
      );
  }
}

function renderInlineNodes(
  nodes: FormattedInlineNode[],
  keyPrefix: string,
  options: InlineRenderOptions,
): ReactNode[] {
  return nodes.map((node, index) =>
    renderInlineNode(node, `${keyPrefix}-${index}`, options),
  );
}

function renderFormattedBlocks(
  blocks: FormattedBlockNode[],
  keyPrefix: string,
  options: InlineRenderOptions,
) {
  return blocks.map((block, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (block.type) {
      case "paragraph":
        return (
          <Text key={key} style={styles.messageText}>
            {renderInlineNodes(block.children, `${key}-inline`, options)}
          </Text>
        );
      case "quote":
        return (
          <View key={key} style={styles.quoteBlock}>
            <Text style={styles.quoteText}>
              {renderInlineNodes(block.children, `${key}-quote`, options)}
            </Text>
          </View>
        );
      case "codeBlock":
        return (
          <View key={key} style={styles.codeBlock}>
            <Text style={styles.codeBlockText}>{block.text}</Text>
          </View>
        );
    }
  });
}

function describeReplyText(replyTo: NonNullable<GroupThreadMessage["replyTo"]>) {
  const text = replyTo.text?.trim();
  return text || "Attachment";
}

const FORMATTED_MESSAGE_CACHE_LIMIT = 300;
const MESSAGE_TIME_CACHE_LIMIT = 500;
const LOCATION_HINT_PATTERN = /(^|\n)\s*📍|https?:\/\/|°\s*[NS]\s*,/i;
const formattedMessageCache = new Map<string, FormattedBlockNode[]>();
const messageTimeCache = new Map<string, string>();

function rememberCachedValue<T>(
  cache: Map<string, T>,
  limit: number,
  key: string,
  value: T,
) {
  cache.set(key, value);

  if (cache.size > limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  return value;
}

function getFormattedMessageBlocks(text: string) {
  const cached = formattedMessageCache.get(text);
  if (cached) {
    formattedMessageCache.delete(text);
    formattedMessageCache.set(text, cached);
    return cached;
  }

  return rememberCachedValue(
    formattedMessageCache,
    FORMATTED_MESSAGE_CACHE_LIMIT,
    text,
    parseFormattedMessage(text),
  );
}

function getMessageTimeLabel(createdAt: string) {
  const cached = messageTimeCache.get(createdAt);
  if (cached) {
    messageTimeCache.delete(createdAt);
    messageTimeCache.set(createdAt, cached);
    return cached;
  }

  return rememberCachedValue(
    messageTimeCache,
    MESSAGE_TIME_CACHE_LIMIT,
    createdAt,
    new Date(createdAt).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
  );
}

function maybeParseSharedLocation(text: string) {
  if (!LOCATION_HINT_PATTERN.test(text)) {
    return null;
  }

  return parseSharedLocation(text);
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  selfAccountId,
  isFirstInGroup,
  isLastInGroup,
  showSenderName,
  showAvatar,
  onImageError,
  onAction,
  onResolveAttachmentAccess,
}: {
  message: GroupThreadMessage;
  isOwnMessage: boolean;
  selfAccountId: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSenderName: boolean;
  showAvatar: boolean;
  onImageError?: (messageId: string) => void;
  onAction?: (messageId: string, action: ContextMenuAction) => void;
  onResolveAttachmentAccess?: (
    messageId: string,
    attachment: NonNullable<GroupThreadMessage["attachment"]>,
  ) => Promise<NonNullable<GroupThreadMessage["attachment"]> | null>;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Record<string, true>
  >({});

  const handleOpenUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // Ignore browser-launch failures and leave the message visible.
    }
  }, []);

  const isSpoilerRevealed = useCallback(
    (spoilerId: string) => Boolean(revealedSpoilers[spoilerId]),
    [revealedSpoilers],
  );

  const handleRevealSpoiler = useCallback((spoilerId: string) => {
    setRevealedSpoilers((current) => {
      if (current[spoilerId]) {
        return current;
      }

      return {
        ...current,
        [spoilerId]: true,
      };
    });
  }, []);

  const inlineRenderOptions = useMemo(
    () => ({
      onOpenUrl: handleOpenUrl,
      isSpoilerRevealed,
      onRevealSpoiler: handleRevealSpoiler,
    }),
    [handleOpenUrl, handleRevealSpoiler, isSpoilerRevealed],
  );
  const systemFormattedBlocks = useMemo(
    () =>
      message.kind === "system_notice"
        ? getFormattedMessageBlocks(message.text ?? "System notice")
        : [],
    [message.kind, message.text],
  );

  if (message.kind === "system_notice") {
    return (
      <View style={styles.systemMessageCard}>
        <View style={styles.formattedMessage}>
          {renderFormattedBlocks(
            systemFormattedBlocks,
            "system",
            inlineRenderOptions,
          )}
        </View>
      </View>
    );
  }

  const isDeleted = Boolean(message.deletedAt);
  const hasText = !isDeleted && Boolean(message.text?.trim());
  const formattedBlocks = useMemo(
    () => (hasText ? getFormattedMessageBlocks(message.text ?? "") : []),
    [hasText, message.text],
  );
  const messageTimeLabel = useMemo(
    () => getMessageTimeLabel(message.createdAt),
    [message.createdAt],
  );
  const attachment = isDeleted ? null : message.attachment;
  const isImage = attachment?.contentClass === "image";
  const reactionEntries = useMemo(
    () =>
      isDeleted
        ? []
        : Object.entries(message.reactions ?? {}).filter(
            ([, accountIds]) => accountIds.length > 0,
          ),
    [isDeleted, message.reactions],
  );
  const sharedLocation = useMemo(
    () => (hasText && !attachment ? maybeParseSharedLocation(message.text!) : null),
    [attachment, hasText, message.text],
  );
  const resolveAttachmentAccess = useMemo(
    () =>
      attachment && onResolveAttachmentAccess
        ? () => onResolveAttachmentAccess(message.id, attachment)
        : undefined,
    [attachment, message.id, onResolveAttachmentAccess],
  );
  const attachmentManager = useAttachmentManager(
    attachment ?? null,
    resolveAttachmentAccess,
  );
  const shouldAutoloadEncryptedImagePreview = Boolean(
    isImage &&
      attachment?.encryptionMode === "device_encrypted" &&
      attachment.protectionProfile !== "sensitive_media",
  );
  const inlineImageUri =
    attachment?.encryptionMode === "device_encrypted"
      ? attachmentManager.resolvedUri
      : attachment?.downloadUrl;

  useEffect(() => {
    if (!shouldAutoloadEncryptedImagePreview) {
      return;
    }

    if (
      attachmentManager.resolvedUri ||
      attachmentManager.isBusy ||
      attachmentManager.status === "ready" ||
      attachmentManager.status === "failed"
    ) {
      return;
    }

    void attachmentManager.prepareForPreview();
  }, [
    attachmentManager.isBusy,
    attachmentManager.prepareForPreview,
    attachmentManager.resolvedUri,
    attachmentManager.status,
    shouldAutoloadEncryptedImagePreview,
  ]);

  const handleOpenAttachment = useCallback(async () => {
    await attachmentManager.openExternally();
  }, [attachmentManager]);

  const handleOpenLocation = useCallback(async () => {
    if (!sharedLocation) {
      return;
    }

    try {
      await Linking.openURL(sharedLocation.mapUrl);
    } catch {
      // Ignore map-launch failures and leave the card visible.
    }
  }, [sharedLocation]);

  // Swipe-to-reply: own messages swipe left, incoming swipe right. The bubble
  // tracks the finger up to a soft cap, fires a single threshold haptic, and on
  // release past the threshold dispatches the same reply action the menu uses.
  const canSwipeReply = !isDeleted && Boolean(onAction);
  const swipeDirection = isOwnMessage ? -1 : 1; // px sign of a valid reply drag
  const translateX = useSharedValue(0);
  const swipeArmed = useSharedValue(false);

  const openMenu = useCallback(() => {
    if (!isDeleted) {
      haptics.medium();
      setMenuVisible(true);
    }
  }, [isDeleted]);

  const dispatchReply = useCallback(() => {
    onAction?.(message.id, { kind: "reply" });
  }, [message.id, onAction]);

  const swipeGesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(300)
      .maxDistance(12)
      .onStart(() => {
        runOnJS(openMenu)();
      });

    const pan = Gesture.Pan()
      // Only claim the gesture once the drag is clearly horizontal in the reply
      // direction, so taps on links/images/reactions and vertical scrolling all
      // still pass through untouched.
      .activeOffsetX(isOwnMessage ? -12 : 12)
      .failOffsetX(isOwnMessage ? 16 : -16)
      .failOffsetY([-12, 12])
      .enabled(canSwipeReply)
      .onUpdate((event) => {
        // Resist drags away from the reply direction; cap the travel softly.
        const raw = event.translationX * swipeDirection;
        const clamped = Math.max(0, Math.min(raw, REPLY_MAX_TRAVEL));
        translateX.value = clamped * swipeDirection;
        const crossed = clamped >= REPLY_THRESHOLD;
        if (crossed && !swipeArmed.value) {
          swipeArmed.value = true;
          runOnJS(haptics.light)();
        } else if (!crossed && swipeArmed.value) {
          swipeArmed.value = false;
        }
      })
      .onEnd(() => {
        if (Math.abs(translateX.value) >= REPLY_THRESHOLD) {
          runOnJS(dispatchReply)();
        }
        translateX.value = withSpring(0, springs.gentle);
        swipeArmed.value = false;
      });

    return Gesture.Simultaneous(longPress, pan);
  }, [
    canSwipeReply,
    dispatchReply,
    isOwnMessage,
    openMenu,
    swipeArmed,
    swipeDirection,
    translateX,
  ]);

  const bubbleSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyHintStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      Math.abs(translateX.value),
      [0, REPLY_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
      transform: [{ scale: 0.6 + progress * 0.4 }],
    };
  });

  return (
    <>
      <GestureDetector gesture={swipeGesture}>
        <View
          style={[
            bubbleStyles.swipeContainer,
            isFirstInGroup
              ? bubbleStyles.rowFirstInGroup
              : bubbleStyles.rowGrouped,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              bubbleStyles.replyHint,
              isOwnMessage
                ? bubbleStyles.replyHintOwn
                : bubbleStyles.replyHintIncoming,
              replyHintStyle,
            ]}
          >
            <Text style={bubbleStyles.replyHintIcon}>↩︎</Text>
          </Animated.View>

          <Animated.View
            style={[
              bubbleStyles.row,
              isOwnMessage && bubbleStyles.rowOwn,
              bubbleSwipeStyle,
            ]}
          >
        {showAvatar && !isOwnMessage ? (
          <View style={bubbleStyles.gutter}>
            {isLastInGroup ? (
              <View
                style={[
                  bubbleStyles.avatar,
                  { backgroundColor: avatarColor(message.senderAccountId) },
                ]}
              >
                <Text style={bubbleStyles.avatarText}>
                  {avatarInitial(message.senderDisplayName)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            bubbleStyles.bubble,
            isOwnMessage && bubbleStyles.bubbleOwn,
            isLastInGroup &&
              (isOwnMessage
                ? bubbleStyles.bubbleOwnTail
                : bubbleStyles.bubbleIncomingTail),
          ]}
        >
          {showSenderName && !isOwnMessage && !isDeleted ? (
            <Text
              numberOfLines={1}
              style={[
                bubbleStyles.senderName,
                { color: avatarColor(message.senderAccountId) },
              ]}
            >
              {message.senderDisplayName}
            </Text>
          ) : null}

          {isDeleted ? (
            <Text style={styles.messageDeletedText}>Message deleted</Text>
          ) : null}

          {!isDeleted && message.replyTo ? (
            <View style={styles.messageReplyPreview}>
              <View style={styles.messageReplyAccent} />
              <View style={styles.messageReplyCopy}>
                <Text style={styles.messageReplySender} numberOfLines={1}>
                  {message.replyTo.senderDisplayName || "Message"}
                </Text>
                <Text style={styles.messageReplyText} numberOfLines={2}>
                  {describeReplyText(message.replyTo)}
                </Text>
              </View>
            </View>
          ) : null}

          {sharedLocation ? (
            <Pressable
              style={styles.locationCard}
              onPress={() => void handleOpenLocation()}
            >
              <View style={styles.locationMapFrame}>
                <Image
                  source={{ uri: sharedLocation.tileUrl }}
                  style={styles.locationMapImage}
                  resizeMode="cover"
                />
                <View
                  style={[
                    styles.locationMapMarker,
                    {
                      left: `${sharedLocation.markerLeftPercent}%`,
                      top: `${sharedLocation.markerTopPercent}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.locationCardBody}>
                <Text style={styles.locationTitle}>{sharedLocation.title}</Text>
                <Text style={styles.locationDetail}>
                  {sharedLocation.detailLabel}
                </Text>
                <View style={styles.locationActionRow}>
                  <Text style={styles.locationActionLabel}>Open map</Text>
                  <Text style={styles.locationAttribution}>
                    Map data © OpenStreetMap
                  </Text>
                </View>
              </View>
            </Pressable>
          ) : hasText ? (
            <View style={styles.formattedMessage}>
              {renderFormattedBlocks(
                formattedBlocks,
                message.id,
                inlineRenderOptions,
              )}
            </View>
          ) : null}

          {isImage && inlineImageUri ? (
            <Pressable onPress={() => setViewerVisible(true)}>
              <Image
                source={{ uri: inlineImageUri }}
                style={styles.messageImage}
                resizeMode="cover"
                onError={() => onImageError?.(message.id)}
              />
            </Pressable>
          ) : null}

          {isImage &&
          attachment?.encryptionMode === "device_encrypted" &&
          !inlineImageUri ? (
            <Pressable onPress={() => setViewerVisible(true)}>
              <View
                style={[
                  styles.messageImage,
                  {
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.inputBackground,
                  },
                ]}
              >
                {attachmentManager.isBusy ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textSoft}
                    style={{ marginBottom: 8 }}
                  />
                ) : null}
                <Text style={styles.attachmentMeta}>
                  {attachmentManager.statusLabel ||
                    "Tap to decrypt and view"}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {attachment && !isImage ? (
            <View style={styles.attachmentActionGroup}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  styles.attachmentActionButton,
                  attachmentManager.isBusy
                    ? styles.primaryButtonDisabled
                    : null,
                ]}
                onPress={() => void handleOpenAttachment()}
                disabled={attachmentManager.isBusy}
              >
                {attachmentManager.isBusy ? (
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.textSoft}
                  />
                ) : (
                  <Text style={styles.secondaryButtonLabel}>
                    {attachmentManager.actionLabel}
                  </Text>
                )}
              </Pressable>
              {attachmentManager.error ? (
                <>
                  <Text style={styles.errorText}>
                    {attachmentManager.error}
                  </Text>
                  {attachmentManager.canRetry ? (
                    <Pressable
                      style={styles.attachmentRetryButton}
                      onPress={() => void attachmentManager.retry()}
                    >
                      <Text style={styles.attachmentRetryLabel}>
                        Retry
                        {attachmentManager.attemptCount > 1
                          ? ` (${attachmentManager.attemptCount})`
                          : ""}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              ) : attachmentManager.statusLabel &&
                attachmentManager.status !== "ready" ? (
                <Text style={styles.helper}>
                  {attachmentManager.statusLabel}
                </Text>
              ) : null}
            </View>
          ) : null}

          {attachment ? (
            <Text style={styles.attachmentMeta}>
              {attachment.fileName} · {formatBytes(attachment.byteLength)}
            </Text>
          ) : null}

          {reactionEntries.length ? (
            <View style={styles.messageReactionRow}>
              {reactionEntries.map(([emoji, accountIds]) => (
                <ReactionChip
                  key={emoji}
                  emoji={emoji}
                  count={accountIds.length}
                  isActive={accountIds.includes(selfAccountId)}
                  onToggle={() =>
                    onAction?.(message.id, { kind: "react", emoji })
                  }
                />
              ))}
            </View>
          ) : null}

          <View style={bubbleStyles.footerRow}>
            <Text
              style={[
                bubbleStyles.footerText,
                isOwnMessage && bubbleStyles.footerTextOwn,
              ]}
            >
              {messageTimeLabel}
              {message.editedAt && !message.deletedAt ? "  edited" : ""}
            </Text>
            {isOwnMessage && !message.deletedAt ? (
              <ReadTicks read={(message.readByCount ?? 0) >= 1} />
            ) : null}
          </View>
            </View>
          </Animated.View>
        </View>
      </GestureDetector>

      <MessageContextMenu
        visible={menuVisible}
        hasText={hasText}
        isImage={isImage}
        canReply={!isDeleted}
        canReact={!isDeleted}
        canEdit={
          !isDeleted &&
          isOwnMessage &&
          hasText &&
          !isImage &&
          message.historyMode === "relay_hosted"
        }
        canDeleteForEveryone={
          !isDeleted && isOwnMessage
        }
        canDeleteLocal={!isDeleted}
        onClose={() => setMenuVisible(false)}
        onAction={(action) => {
          if (action.kind === "copy" && message.text) {
            Clipboard.setString(message.text);
          } else if (action.kind === "view") {
            setViewerVisible(true);
            return;
          }
          onAction?.(message.id, action);
        }}
      />

      {isImage ? (
        <ImageViewerModal
          attachment={attachment ?? null}
          plainUri={attachmentManager.resolvedUri}
          resolveAttachmentAccess={resolveAttachmentAccess}
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
        />
      ) : null}
    </>
  );
});
