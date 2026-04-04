import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "../styles";

export type ContextMenuAction =
  | { kind: "copy" }
  | { kind: "edit" }
  | { kind: "delete" };

type MessageContextMenuProps = {
  visible: boolean;
  isOwnMessage: boolean;
  hasText: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

export function MessageContextMenu({
  visible,
  isOwnMessage,
  hasText,
  onAction,
  onClose,
}: MessageContextMenuProps) {
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

          {hasText ? (
            <>
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => { onClose(); onAction({ kind: "copy" }); }}
              >
                <Text style={styles.contextMenuItemLabel}>Copy text</Text>
              </Pressable>
              <View style={styles.contextMenuDivider} />
            </>
          ) : null}

          {isOwnMessage ? (
            <>
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => { onClose(); onAction({ kind: "edit" }); }}
              >
                <Text style={styles.contextMenuItemLabel}>Edit message</Text>
              </Pressable>
              <View style={styles.contextMenuDivider} />
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => { onClose(); onAction({ kind: "delete" }); }}
              >
                <Text style={[styles.contextMenuItemLabel, styles.contextMenuItemDestructive]}>
                  Delete (locally)
                </Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
