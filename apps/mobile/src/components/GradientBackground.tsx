import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { theme } from "../styles";

// Anchor the gradient in the same obsidian-dark surfaces the rest of the app
// uses (appBackground / panel / panelStrong via the shared theme) so the
// background never diverges from the palette. A diagonal sweep keeps the base
// calm; two low-opacity ember glows reuse the previous orb colors to add warmth
// without the flat "fake orb" look.
const gradientColors = [
  theme.colors.panelStrong,
  theme.colors.background,
  theme.colors.background,
] as const;

const gradientLocations = [0, 0.55, 1] as const;

/**
 * App-wide ember-themed background. Renders a real diagonal LinearGradient
 * grounded in the dark app palette with a couple of soft glow accents layered
 * on top. It fills the screen, sits behind all content, and is fully
 * non-interactive.
 */
export function GradientBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={gradientColors}
        locations={gradientLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Soft circular glows reuse the existing ember orb tones for warmth.
  glowTop: {
    position: "absolute",
    top: -160,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 320,
    backgroundColor: "rgba(255, 173, 112, 0.08)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    left: -150,
    width: 300,
    height: 300,
    borderRadius: 300,
    backgroundColor: "rgba(234, 111, 63, 0.07)",
  },
});
