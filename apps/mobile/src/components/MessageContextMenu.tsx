import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../styles";
import { haptics } from "../lib/haptics";
import { springs, timings } from "../lib/motion";

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

/**
 * Telegram/Signal-style contextual menu. A full-screen blurred backdrop fades in
 * while the reaction quick-row and action list spring up with a subtle scale, so
 * the menu reads as if it grew out of the long-pressed bubble rather than
 * sliding up as a sheet. The public props are unchanged from the previous
 * bottom-sheet implementation so callers need no changes.
 */
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
  const backdropOpacity = useSharedValue(0);
  const menuProgress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      haptics.medium();
      backdropOpacity.value = withTiming(1, timings.fast);
      menuProgress.value = withSpring(1, springs.snappy);
    } else {
      backdropOpacity.value = 0;
      menuProgress.value = 0;
    }
  }, [backdropOpacity, menuProgress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { scale: 0.92 + menuProgress.value * 0.08 },
      { translateY: 16 - menuProgress.value * 16 },
    ],
  }));

  // Track whether we have rendered at least one item (for divider placement).
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
        {needsDivider ? <View style={menuStyles.divider} /> : null}
        <Pressable
          style={menuStyles.item}
          onPress={() => {
            haptics.selection();
            onClose();
            onAction(action);
          }}
        >
          <Text
            style={[
              menuStyles.itemLabel,
              destructive ? menuStyles.itemLabelDestructive : null,
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
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={menuStyles.root}>
        <AnimatedBlurView
          intensity={28}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, backdropStyle]}
        />
        <Animated.View
          style={[menuStyles.dim, backdropStyle]}
          pointerEvents="none"
        />
        <Pressable style={menuStyles.dismissArea} onPress={onClose} />

        <Animated.View style={[menuStyles.menu, menuStyle]}>
          {canReact ? (
            <Animated.View
              entering={FadeIn.duration(160).delay(40)}
              style={menuStyles.reactionRow}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  style={menuStyles.reactionButton}
                  onPress={() => {
                    haptics.selection();
                    onClose();
                    onAction({ kind: "react", emoji });
                  }}
                >
                  <Text style={menuStyles.reactionLabel}>{emoji}</Text>
                </Pressable>
              ))}
            </Animated.View>
          ) : null}

          <View style={menuStyles.actionCard}>
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
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const colors = theme.colors;

const menuStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  // Dark wash layered over the blur so there is always a dim even when the
  // platform falls back to a non-blurred BlurView.
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  // Full-screen tap target behind the menu that closes on press.
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  reactionRow: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelStrong,
  },
  reactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionLabel: {
    fontSize: 24,
    lineHeight: 28,
  },
  actionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelStrong,
    overflow: "hidden",
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  itemLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  itemLabelDestructive: {
    color: colors.errorText,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
});
