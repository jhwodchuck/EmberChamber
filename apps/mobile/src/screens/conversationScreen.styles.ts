import { StyleSheet } from "react-native";
import { theme } from "../styles";

// Co-located layout for the polished conversation surface: the animated typing
// indicator and the jump-to-bottom FAB. Kept out of the shared src/styles.ts
// monolith so the polish work can iterate independently. Colors come from the
// shared theme so this stays in lockstep with the design tokens.
const colors = theme.colors;

const FAB_SIZE = 44;

export const conversationScreenStyles = StyleSheet.create({
  // Row that pairs the animated dots with the existing "… is typing" copy.
  typingBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  // Absolutely positioned just above the composer, anchored bottom-right.
  scrollToEndFab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceStrong,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  scrollToEndFabPressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollToEndFabIcon: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
});
