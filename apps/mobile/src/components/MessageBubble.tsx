import { useState } from "react";
import { ActivityIndicator, Clipboard, Image, Linking, Pressable, Text, View } from "react-native";
import type { GroupThreadMessage } from "../types";
import { formatBytes, parseSharedLocation } from "../lib/utils";
import { styles, theme } from "../styles";
import { ImageViewerModal } from "./ImageViewerModal";
import { MessageContextMenu, type ContextMenuAction } from "./MessageContextMenu";
import { useAttachmentManager } from "../hooks/useAttachmentManager";

// ---------------------------------------------------------------------------
// Lightweight inline markdown renderer
// Bold **x**, italic _x_, inline `code`.
// ---------------------------------------------------------------------------
function renderMarkdown(text: string, keyPrefix = "md"): React.ReactNode[] {
  // Split on bold, italic, code markers in order of precedence
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|_(.+?)_|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    if (m[2] !== undefined) {
      parts.push(<Text key={`${keyPrefix}-${key++}`} style={{ fontWeight: "700" }}>{m[2]}</Text>);
    } else if (m[3] !== undefined) {
      parts.push(<Text key={`${keyPrefix}-${key++}`} style={{ fontStyle: "italic" }}>{m[3]}</Text>);
    } else if (m[4] !== undefined) {
      parts.push(
        <Text key={`${keyPrefix}-${key++}`} style={{ fontFamily: "monospace", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
          {m[4]}
        </Text>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMessageText(text: string, onOpenUrl: (url: string) => void): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const urlPattern = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,!?;:)]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = urlPattern.exec(text)) !== null) {
    const rawUrl = match[0];
    const trailingPunctuation = rawUrl.match(/[.,!?;:)]*$/)?.[0] || "";
    const cleanUrl = trailingPunctuation ? rawUrl.slice(0, -trailingPunctuation.length) : rawUrl;

    if (match.index > lastIndex) {
      parts.push(...renderMarkdown(text.slice(lastIndex, match.index), `md-${key}`));
    }

    parts.push(
      <Text key={`link-${key++}`} style={styles.inlineLink} onPress={() => onOpenUrl(cleanUrl)}>
        {cleanUrl}
      </Text>
    );

    if (trailingPunctuation) {
      parts.push(trailingPunctuation);
    }

    lastIndex = match.index + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push(...renderMarkdown(text.slice(lastIndex), `md-tail-${key}`));
  }

  return parts;
}

// ---------------------------------------------------------------------------

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

  async function handleOpenUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      // Ignore browser-launch failures and leave the message visible.
    }
  }

  if (message.kind === "system_notice") {
    return (
      <View style={styles.systemMessageCard}>
        <Text style={styles.systemMessageText}>
          {renderMessageText(message.text ?? "System notice", handleOpenUrl)}
        </Text>
      </View>
    );
  }

  const hasText = Boolean(message.text?.trim());
  const attachment = message.attachment;
  const isImage = attachment?.contentClass === "image";
  const sharedLocation = hasText && !attachment ? parseSharedLocation(message.text!) : null;
  const resolveAttachmentAccess =
    attachment && onResolveAttachmentAccess
      ? () => onResolveAttachmentAccess(message.id, attachment)
      : undefined;
  const attachmentManager = useAttachmentManager(
    attachment ?? null,
    resolveAttachmentAccess,
  );

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
        <View style={[styles.messageBubble, isOwnMessage ? styles.messageBubbleOwn : null]}>
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
            <Pressable style={styles.locationCard} onPress={() => void handleOpenLocation()}>
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
                <Text style={styles.locationDetail}>{sharedLocation.detailLabel}</Text>
                <View style={styles.locationActionRow}>
                  <Text style={styles.locationActionLabel}>Open map</Text>
                  <Text style={styles.locationAttribution}>Map data © OpenStreetMap</Text>
                </View>
              </View>
            </Pressable>
          ) : hasText ? (
            <Text style={styles.messageText}>
              {renderMessageText(message.text!, handleOpenUrl)}
            </Text>
          ) : null}

          {isImage && attachment?.encryptionMode !== "device_encrypted" ? (
            <Pressable onPress={() => setViewerVisible(true)}>
              <Image
                source={{ uri: attachment!.downloadUrl }}
                style={styles.messageImage}
                resizeMode="cover"
                onError={() => onImageError?.(message.id)}
              />
            </Pressable>
          ) : null}

          {isImage && attachment?.encryptionMode === "device_encrypted" ? (
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
                <Text style={styles.attachmentMeta}>Tap to decrypt and view</Text>
              </View>
            </Pressable>
          ) : null}

          {attachment && !isImage ? (
            <View style={styles.attachmentActionGroup}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  styles.attachmentActionButton,
                  attachmentManager.isBusy ? styles.primaryButtonDisabled : null,
                ]}
                onPress={() => void handleOpenAttachment()}
                disabled={attachmentManager.isBusy}
              >
                {attachmentManager.isBusy ? (
                  <ActivityIndicator size="small" color={theme.colors.textSoft} />
                ) : (
                  <Text style={styles.secondaryButtonLabel}>
                    {attachmentManager.actionLabel}
                  </Text>
                )}
              </Pressable>
              {attachmentManager.error ? (
                <>
                  <Text style={styles.errorText}>{attachmentManager.error}</Text>
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
              ) : attachmentManager.statusLabel && attachmentManager.status !== "ready" ? (
                <Text style={styles.helper}>{attachmentManager.statusLabel}</Text>
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
          resolveAttachmentAccess={resolveAttachmentAccess}
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
        />
      ) : null}
    </>
  );
}
