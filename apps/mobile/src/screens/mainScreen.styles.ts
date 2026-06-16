import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },

  shellBanner: {
    gap: 8,
  },

  appBody: {
    flex: 1,
    minHeight: 0,
  },

  appTabBar: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: 18,
    padding: 8,
  },

  appTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },

  appTabButtonActive: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },

  appTabLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  appTabLabelActive: {
    color: colors.textSoft,
  },
});
