import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },

  contextMenuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.panelStrong,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingBottom: 36,
    paddingTop: 12,
  },

  contextMenuDrag: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },

  contextReactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
  },

  contextReactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  contextReactionLabel: {
    fontSize: 22,
    lineHeight: 26,
  },

  contextMenuItem: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  contextMenuItemLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  contextMenuItemDestructive: {
    color: colors.errorText,
  },

  contextMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
});
