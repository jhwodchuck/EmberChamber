import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 6,
  },

  toggleTextBlock: {
    flex: 1,
    gap: 4,
  },

  toggleTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },

  toggleDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  toggleTrack: {
    width: 50,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: 4,
    justifyContent: "center",
  },

  toggleTrackOn: {
    backgroundColor: "rgba(234, 111, 63, 0.38)",
  },

  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f0dbd0",
  },

  toggleThumbOn: {
    alignSelf: "flex-end",
    backgroundColor: colors.textPrimary,
  },
});
