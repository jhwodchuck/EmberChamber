import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { styles } from "../styles";

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

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (action: AttachMenuAction) => void;
};

export function AttachMenuSheet({ visible, onClose, onSelect }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  async function handleCameraPress() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    onClose();
    onSelect("camera");
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
        <Pressable style={styles.attachMenuSheet}>
          <View style={styles.contextMenuDrag} />

          {/* Camera live preview tile */}
          <Pressable
            style={styles.attachCameraPreview}
            onPress={handleCameraPress}
          >
            {visible && permission?.granted ? (
              <CameraView style={StyleSheet.absoluteFillObject} facing="back" />
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
      </Pressable>
    </Modal>
  );
}
