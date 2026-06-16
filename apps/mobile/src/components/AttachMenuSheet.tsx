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
import { CameraView, useCameraPermissions } from "expo-camera";
import { styles as sharedStyles } from "../styles";
import { styles as attachStyles } from "./attachMenuSheet.styles";
import { styles as contextStyles } from "./contextMenuSheet.styles";

const styles = { ...sharedStyles, ...attachStyles, ...contextStyles };
import { haptics } from "../lib/haptics";
import { springs, timings } from "../lib/motion";

export type AttachMenuAction =
  | "camera"
  | "gallery"
  | "file"
  | "location"
  | "poll"
  | "checklist";

const GRID_ITEMS: { id: AttachMenuAction; icon: string; label: string }[] = [
  { id: "gallery", icon: "🖼️", label: "Media" },
  { id: "file", icon: "📄", label: "File" },
  { id: "location", icon: "📍", label: "Location" },
  { id: "poll", icon: "📊", label: "Poll" },
  { id: "checklist", icon: "☑️", label: "Checklist" },
];

// Distance the panel travels before its real height is measured. Large enough to
// start fully off-screen on any phone so the first open frame never flashes the
// sheet in place.
const FALLBACK_OFFSET = 600;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: AttachMenuAction) => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AttachMenuSheet({ visible, onClose, onSelect }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
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

  async function handleCameraPress() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    haptics.selection();
    onClose();
    onSelect("camera");
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
          <Pressable style={styles.attachMenuSheet}>
            <View style={styles.contextMenuDrag} />

            {/* Camera live preview tile */}
            <Pressable
              style={styles.attachCameraPreview}
              onPress={handleCameraPress}
            >
              {visible && permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                />
              ) : (
                <View style={styles.attachCameraPlaceholder}>
                  <Text style={styles.attachCameraPlaceholderIcon}>📷</Text>
                  <Text style={styles.attachCameraPlaceholderLabel}>
                    {permission?.granted === false
                      ? "Tap to enable camera"
                      : "Camera"}
                  </Text>
                </View>
              )}
              <View style={styles.attachCameraHintBadge}>
                <Text style={styles.attachCameraHintText}>
                  Tap to shoot or record
                </Text>
              </View>
            </Pressable>

            {/* Five-tile grid */}
            <View style={styles.attachGrid}>
              {GRID_ITEMS.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.attachGridTile}
                  onPress={() => {
                    haptics.selection();
                    onClose();
                    onSelect(item.id);
                  }}
                >
                  <View style={styles.attachGridIconCircle}>
                    <Text style={styles.attachGridIconText}>{item.icon}</Text>
                  </View>
                  <Text style={styles.attachGridLabel}>{item.label}</Text>
                </Pressable>
              ))}
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
