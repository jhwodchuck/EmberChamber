import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "../styles";

export type ContextMenuAction =
  | { kind: "copy" }
  | { kind: "edit" }
  | { kind: "delete" }
  | { kind: "view" };

type MessageContextMenuProps = {
  visible: boolean;
  isOwnMessage: boolean;
  hasText: boolean;
  isImage?: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

export function MessageContextMenu({
  visible,
  isOwnMessage,
  hasText,
  isImage,
  onAction,
  onClose,
}: MessageContextMenuProps) {
  // Track whether we have rendered at least one item (for divider placement)
  let itemCount = 0;

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

          {isImage ? (
            <Item label="View image" action={{ kind: "view" }} />
          ) : null}

          {hasText ? (
            <Item label="Copy text" action={{ kind: "copy" }} />
          ) : null}

          {isOwnMessage && !isImage ? (
            <Item label="Edit message" action={{ kind: "edit" }} />
          ) : null}

          {isOwnMessage ? (
            <Item
              label="Delete (locally)"
              destructive
              action={{ kind: "delete" }}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
