import { ActivityIndicator, Text, View } from "react-native";
import { styles, theme } from "../styles";

export function AppBootstrap() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={theme.colors.textSoft} />
      <Text style={styles.loadingText}>Preparing local device storage…</Text>
    </View>
  );
}
