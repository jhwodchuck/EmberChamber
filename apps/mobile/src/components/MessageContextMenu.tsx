import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "../styles";

export type ContextMenuAction =
  | { kind: "copy" }
  | { kind: "edit" }
  | { kind: "reply" }
  | { kind: "react"; emoji: string }
  | { kind: "delete_for_everyone" }
  | { kind: "delete_local" }
  | { kind: "view" };

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

type MessageContextMenuProps = {
  visible: boolean;
  hasText: boolean;
  isImage?: boolean;
  canReply?: boolean;
  canReact?: boolean;
  canEdit?: boolean;
  canDeleteForEveryone?: boolean;
  canDeleteLocal?: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

export function MessageContextMenu({
  visible,
  hasText,
  isImage,
  canReply,
  canReact,
  canEdit,
  canDeleteForEveryone,
  canDeleteLocal,
  onAction,
  onClose,
}: MessageContextMenuProps) {
  // Track whether we have rendered at least one item (for divider placement)
  let itemCount = canReact ? 1 : 0;

  function Item({
    label,
    destructive,
    action,
  }: {
    label: string;
    destructive?: boolean;
    action: ContextMenuAction;
  }) {
    const needsDivider = itemCount > 0;
    itemCount += 1;
    return (
      <>
        {needsDivider ? <View style={styles.contextMenuDivider} /> : null}
        <Pressable
          style={styles.contextMenuItem}
          onPress={() => {
            onClose();
            onAction(action);
          }}
        >
          <Text
            style={[
              styles.contextMenuItemLabel,
              destructive ? styles.contextMenuItemDestructive : null,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      </>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.contextMenuOverlay} onPress={onClose}>
        <Pressable style={styles.contextMenuSheet}>
          <View style={styles.contextMenuDrag} />

          {canReact ? (
            <View style={styles.contextReactionRow}>
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={styles.contextReactionButton}
                  onPress={() => {
                    onClose();
                    onAction({ kind: "react", emoji });
                  }}
                >
                  <Text style={styles.contextReactionLabel}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {canReply ? (
            <Item label="Reply" action={{ kind: "reply" }} />
          ) : null}

          {isImage ? (
            <Item label="View image" action={{ kind: "view" }} />
          ) : null}

          {hasText ? (
            <Item label="Copy text" action={{ kind: "copy" }} />
          ) : null}

          {canEdit ? (
            <Item label="Edit message" action={{ kind: "edit" }} />
          ) : null}

          {canDeleteForEveryone ? (
            <Item
              label="Delete for everyone"
              destructive
              action={{ kind: "delete_for_everyone" }}
            />
          ) : null}

          {canDeleteLocal ? (
            <Item
              label="Remove from this device"
              destructive
              action={{ kind: "delete_local" }}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
