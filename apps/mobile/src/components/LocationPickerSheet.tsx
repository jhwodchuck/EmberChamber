import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { styles } from "../styles";

export type LocationChoice =
  | { kind: "once" }
  | { kind: "live"; durationMinutes: number };

const LIVE_DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "1 hour", value: 60 },
  { label: "8 hours", value: 480 },
];

type Props = {
  visible: boolean;
  isLocating: boolean;
  onClose: () => void;
  onPick: (choice: LocationChoice) => void;
};

export function LocationPickerSheet({
  visible,
  isLocating,
  onClose,
  onPick,
}: Props) {
  const [liveDuration, setLiveDuration] = useState(60);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.contextMenuOverlay} onPress={onClose}>
        <Pressable style={styles.attachSubSheet}>
          <View style={styles.contextMenuDrag} />
          <Text style={styles.attachSubSheetTitle}>Share location</Text>

          {/* One-time */}
          <Pressable
            style={[
              styles.attachSubSheetOption,
              isLocating ? styles.primaryButtonDisabled : null,
            ]}
            onPress={() => onPick({ kind: "once" })}
            disabled={isLocating}
          >
            <Text style={styles.attachSubSheetOptionIcon}>📍</Text>
            <View style={styles.attachSubSheetOptionCopy}>
              <Text style={styles.attachSubSheetOptionLabel}>Share once</Text>
              <Text style={styles.attachSubSheetOptionHint}>
                Sends your current coordinates as a one-time message
              </Text>
            </View>
          </Pressable>

          <View style={styles.contextMenuDivider} />

          {/* Live location */}
          <View style={styles.attachSubSheetOption}>
            <Text style={styles.attachSubSheetOptionIcon}>🔴</Text>
            <View style={[styles.attachSubSheetOptionCopy, { flex: 1 }]}>
              <Text style={styles.attachSubSheetOptionLabel}>
                Live location
              </Text>
              <Text style={styles.attachSubSheetOptionHint}>Duration</Text>
              <View style={styles.attachDurationRow}>
                {LIVE_DURATIONS.map((d) => (
                  <Pressable
                    key={d.value}
                    style={[
                      styles.attachDurationChip,
                      liveDuration === d.value
                        ? styles.attachDurationChipActive
                        : null,
                    ]}
                    onPress={() => setLiveDuration(d.value)}
                  >
                    <Text
                      style={[
                        styles.attachDurationChipLabel,
                        liveDuration === d.value
                          ? styles.attachDurationChipLabelActive
                          : null,
                      ]}
                    >
                      {d.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Pressable
            style={[
              styles.primaryButton,
              isLocating ? styles.primaryButtonDisabled : null,
            ]}
            onPress={() =>
              onPick({ kind: "live", durationMinutes: liveDuration })
            }
            disabled={isLocating}
          >
            <Text style={styles.primaryButtonLabel}>
              {isLocating ? "Getting location…" : "Start live location"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
