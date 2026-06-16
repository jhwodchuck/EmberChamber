import { StyleSheet, Platform } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  formatToolbar: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
  },

  formatButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  formatButtonActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },

  formatButtonLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },

  formatButtonLabelActive: {
    color: colors.textSoft,
  },

  formatMenuHeader: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 6,
  },

  formatMenuItemMeta: {
    flex: 1,
    gap: 4,
  },

  formatMenuSyntax: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },

  formatMenuFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },

  formatMenuFooterText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
