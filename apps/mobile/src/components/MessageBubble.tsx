import { Image, Text, View } from "react-native";
import type { GroupThreadMessage } from "../types";
import { formatBytes } from "../lib/utils";
import { styles } from "../styles";

export function MessageBubble({
  message,
  isOwnMessage,
  onImageError,
}: {
  message: GroupThreadMessage;
  isOwnMessage: boolean;
  onImageError?: (messageId: string) => void;
}) {
  if (message.kind === "system_notice") {
    return (
      <View style={styles.systemMessageCard}>
        <Text style={styles.systemMessageText}>{message.text ?? "System notice"}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, isOwnMessage ? styles.messageRowOwn : null]}>
      <View style={[styles.messageBubble, isOwnMessage ? styles.messageBubbleOwn : null]}>
        <Text style={styles.messageMeta}>
          {isOwnMessage ? "You" : message.senderDisplayName} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </Text>
        {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
        {message.attachment?.contentClass === "image" ? (
          <Image
            source={{ uri: message.attachment.downloadUrl }}
            style={styles.messageImage}
            resizeMode="cover"
            onError={() => onImageError?.(message.id)}
          />
        ) : null}
        {message.attachment ? (
          <Text style={styles.attachmentMeta}>
            {message.attachment.fileName} · {formatBytes(message.attachment.byteLength)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
