import { useState } from "react";
import { Clipboard, Image, Pressable, Text, View } from "react-native";
import type { GroupThreadMessage } from "../types";
import { formatBytes } from "../lib/utils";
import { styles, theme } from "../styles";
import { ImageViewerModal } from "./ImageViewerModal";
import { MessageContextMenu, type ContextMenuAction } from "./MessageContextMenu";

// ---------------------------------------------------------------------------
// Lightweight inline markdown renderer
// Bold **x**, italic _x_, inline `code`.
// ---------------------------------------------------------------------------
function renderMarkdown(text: string): React.ReactNode[] {
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
      parts.push(<Text key={key++} style={{ fontWeight: "700" }}>{m[2]}</Text>);
    } else if (m[3] !== undefined) {
      parts.push(<Text key={key++} style={{ fontStyle: "italic" }}>{m[3]}</Text>);
    } else if (m[4] !== undefined) {
      parts.push(
        <Text key={key++} style={{ fontFamily: "monospace", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
          {m[4]}
        </Text>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ---------------------------------------------------------------------------

export function MessageBubble({
  message,
  isOwnMessage,
  onImageError,
  onAction,
}: {
  message: GroupThreadMessage;
  isOwnMessage: boolean;
  onImageError?: (messageId: string) => void;
  onAction?: (messageId: string, action: ContextMenuAction) => void;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);

  if (message.kind === "system_notice") {
    return (
      <View style={styles.systemMessageCard}>
        <Text style={styles.systemMessageText}>{message.text ?? "System notice"}</Text>
      </View>
    );
  }

  const hasText = Boolean(message.text?.trim());
  const attachment = message.attachment;
  const isImage = attachment?.contentClass === "image";

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

          {hasText ? (
            <Text style={styles.messageText}>
              {renderMarkdown(message.text!)}
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
              <View style={[styles.messageImage, { alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.inputBackground }]}>
                <Text style={styles.attachmentMeta}>Tap to decrypt and view</Text>
              </View>
            </Pressable>
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
        onClose={() => setMenuVisible(false)}
        onAction={(action) => {
          if (action.kind === "copy" && message.text) {
            Clipboard.setString(message.text);
          }
          onAction?.(message.id, action);
        }}
      />

      {isImage ? (
        <ImageViewerModal
          attachment={attachment ?? null}
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
        />
      ) : null}
    </>
  );
}

