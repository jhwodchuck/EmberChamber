import { useEffect, useState } from "react";
import {
  type LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { DraftFormatAction } from "../lib/messageDraftFormatting";
import { styles } from "../styles";
import { haptics } from "../lib/haptics";
import { springs, timings } from "../lib/motion";

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

// Distance the panel travels before its real height is measured. Large enough to
// start fully off-screen on any phone so the first open frame never flashes the
// sheet in place.
const FALLBACK_OFFSET = 600;

type FormattingMenuSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: DraftFormatAction) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FormattingMenuSheet({
  visible,
  onClose,
  onSelect,
}: FormattingMenuSheetProps) {
  // Keep the Modal mounted while the close animation plays out, then unmount
  // once the panel has fully slid away.
  const [mounted, setMounted] = useState(visible);

  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(FALLBACK_OFFSET);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, springs.gentle);
    } else {
      progress.value = withTiming(0, timings.base, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
  }, [progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight.value }],
  }));

  function handlePanelLayout(event: LayoutChangeEvent) {
    sheetHeight.value = event.nativeEvent.layout.height;
  }

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={localStyles.root}>
        <AnimatedPressable
          style={[StyleSheet.absoluteFill, localStyles.backdrop, backdropStyle]}
          onPress={onClose}
        />
        <Animated.View
          style={[localStyles.panel, panelStyle]}
          onLayout={handlePanelLayout}
        >
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
                    haptics.selection();
                    onClose();
                    onSelect(item.action);
                  }}
                >
                  <View style={styles.formatMenuItemMeta}>
                    <Text style={styles.contextMenuItemLabel}>
                      {item.label}
                    </Text>
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  panel: {
    width: "100%",
  },
});
