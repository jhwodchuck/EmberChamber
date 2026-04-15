import { useEffect, useState, type ReactNode } from "react";
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

export function MessageBubble({
  message,
  isOwnMessage,
  onImageError,
  onAction,
  onResolveAttachmentAccess,
}: {
  message: GroupThreadMessage;
  isOwnMessage: boolean;
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

  async function handleOpenUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      // Ignore browser-launch failures and leave the message visible.
    }
  }

  function isSpoilerRevealed(spoilerId: string) {
    return Boolean(revealedSpoilers[spoilerId]);
  }

  function handleRevealSpoiler(spoilerId: string) {
    setRevealedSpoilers((current) => {
      if (current[spoilerId]) {
        return current;
      }

      return {
        ...current,
        [spoilerId]: true,
      };
    });
  }

  const inlineRenderOptions = {
    onOpenUrl: handleOpenUrl,
    isSpoilerRevealed,
    onRevealSpoiler: handleRevealSpoiler,
  };

  if (message.kind === "system_notice") {
    return (
      <View style={styles.systemMessageCard}>
        <View style={styles.formattedMessage}>
          {renderFormattedBlocks(
            parseFormattedMessage(message.text ?? "System notice"),
            "system",
            inlineRenderOptions,
          )}
        </View>
      </View>
    );
  }

  const hasText = Boolean(message.text?.trim());
  const formattedBlocks = hasText
    ? parseFormattedMessage(message.text ?? "")
    : [];
  const attachment = message.attachment;
  const isImage = attachment?.contentClass === "image";
  const sharedLocation =
    hasText && !attachment ? parseSharedLocation(message.text!) : null;
  const resolveAttachmentAccess =
    attachment && onResolveAttachmentAccess
      ? () => onResolveAttachmentAccess(message.id, attachment)
      : undefined;
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

  async function handleOpenAttachment() {
    await attachmentManager.openExternally();
  }

  async function handleOpenLocation() {
    if (!sharedLocation) {
      return;
    }

    try {
      await Linking.openURL(sharedLocation.mapUrl);
    } catch {
      // Ignore map-launch failures and leave the card visible.
    }
  }

  return (
    <>
      <Pressable
        onLongPress={() => setMenuVisible(true)}
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
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            {message.editedAt ? "  · edited" : ""}
            {isOwnMessage
              ? (message.readByCount ?? 0) >= 1
                ? "  ✓✓"
                : "  ✓"
              : ""}
          </Text>

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
        </View>
      </Pressable>

      <MessageContextMenu
        visible={menuVisible}
        isOwnMessage={isOwnMessage}
        hasText={hasText}
        isImage={isImage}
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
}
