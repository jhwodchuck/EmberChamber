import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  memberRosterSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.panelStrong,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: 20,
    paddingBottom: 48,
    gap: 16,
    minHeight: 300,
    maxHeight: "85%",
  },

  memberRosterScroll: {
    flexGrow: 0,
  },

  memberRosterLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },

  memberRosterLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  memberRosterList: {
    gap: 4,
  },

  memberRosterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
  },

  memberRosterAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },

  memberRosterAvatarText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  memberRosterCopy: {
    flex: 1,
    gap: 2,
  },

  memberRosterName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },

  memberRosterMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },

  memberRosterChevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: "300",
    marginLeft: 4,
  },
});
