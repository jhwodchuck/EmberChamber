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
import {
  parseFormattedMessage,
  type FormattedBlockNode,
  type FormattedInlineNode,
} from "@emberchamber/shared";
import type { GroupThreadMessage } from "../types";
import { formatBytes, parseSharedLocation } from "../lib/utils";
import { styles, theme } from "../styles";
import { ImageViewerModal } from "./ImageViewerModal";
import {
  MessageContextMenu,
  type ContextMenuAction,
} from "./MessageContextMenu";
import { useAttachmentManager } from "../hooks/useAttachmentManager";

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
  onImageError,
  onAction,
  onResolveAttachmentAccess,
}: {
  message: GroupThreadMessage;
  isOwnMessage: boolean;
  selfAccountId: string;
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

  return (
    <>
      <Pressable
        onLongPress={() => {
          if (!isDeleted) {
            setMenuVisible(true);
          }
        }}
        delayLongPress={300}
        style={[styles.messageRow, isOwnMessage ? styles.messageRowOwn : null]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.messageBubbleOwn : null,
          ]}
        >
          <Text style={styles.messageMeta}>
            {isOwnMessage ? "You" : message.senderDisplayName}
            {" · "}
            {messageTimeLabel}
            {message.deletedAt
              ? "  · deleted"
              : message.editedAt
                ? "  · edited"
                : ""}
            {isOwnMessage
              ? (message.readByCount ?? 0) >= 1
                ? "  ✓✓"
                : "  ✓"
              : ""}
          </Text>

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
              {reactionEntries.map(([emoji, accountIds]) => {
                const isActive = accountIds.includes(selfAccountId);
                return (
                  <Pressable
                    key={emoji}
                    style={[
                      styles.messageReactionChip,
                      isActive ? styles.messageReactionChipActive : null,
                    ]}
                    onPress={() =>
                      onAction?.(message.id, { kind: "react", emoji })
                    }
                  >
                    <Text style={styles.messageReactionText}>
                      {emoji} {accountIds.length}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </Pressable>

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
