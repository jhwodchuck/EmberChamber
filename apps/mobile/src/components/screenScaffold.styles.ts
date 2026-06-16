import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  screenSection: {
    flex: 1,
    gap: 12,
  },

  screenScroll: {
    flex: 1,
  },

  screenScrollContent: {
    gap: 12,
    paddingBottom: 20,
  },

  screenHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  screenHeader: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 2,
  },

  screenHeaderActionSlot: {
    paddingTop: 2,
  },

  screenHeaderActionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  screenHeaderActionLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  screenSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
