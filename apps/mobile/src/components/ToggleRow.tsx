import { Pressable, Text, View } from "react-native";
import { styles } from "../styles";

export function ToggleRow({
  title,
  description,
  value,
  onPress,
}: {
  title: string;
  description: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.toggleRow}>
      <View style={styles.toggleTextBlock}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <View style={[styles.toggleTrack, value ? styles.toggleTrackOn : null]}>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : null]} />
      </View>
    </Pressable>
  );
}
