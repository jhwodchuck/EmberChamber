import { Modal, Pressable, Text, View } from "react-native";
import type { DraftFormatAction } from "../lib/messageDraftFormatting";
import { styles } from "../styles";

const FORMAT_ITEMS: Array<{
  action: DraftFormatAction;
  label: string;
  syntax: string;
}> = [
  { action: "bold", label: "Bold", syntax: "**selected text**" },
  { action: "italic", label: "Italic", syntax: "_selected text_" },
  { action: "strikethrough", label: "Strikethrough", syntax: "~~selected text~~" },
  { action: "code", label: "Inline code", syntax: "`selected text`" },
  { action: "codeBlock", label: "Code block", syntax: "```\\nselected text\\n```" },
  { action: "quote", label: "Quote", syntax: "> selected text" },
  { action: "spoiler", label: "Spoiler", syntax: "||selected text||" },
];

type FormattingMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: DraftFormatAction) => void;
};

export function FormattingMenuSheet({
  visible,
  onClose,
  onSelect,
}: FormattingMenuSheetProps) {
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

          <View style={styles.formatMenuHeader}>
            <Text style={styles.modalTitle}>Formatting</Text>
            <Text style={styles.helper}>
              Select text first to wrap it, or insert formatting markers at the
              cursor.
            </Text>
          </View>

          {FORMAT_ITEMS.map((item, index) => (
            <View key={item.action}>
              {index > 0 ? <View style={styles.contextMenuDivider} /> : null}
              <Pressable
                style={styles.contextMenuItem}
                onPress={() => {
                  onClose();
                  onSelect(item.action);
                }}
              >
                <View style={styles.formatMenuItemMeta}>
                  <Text style={styles.contextMenuItemLabel}>{item.label}</Text>
                  <Text style={styles.formatMenuSyntax}>{item.syntax}</Text>
                </View>
              </Pressable>
            </View>
          ))}

          <View style={styles.formatMenuFooter}>
            <Text style={styles.formatMenuFooterText}>
              Links and @mentions format automatically when you type or paste
              them.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
