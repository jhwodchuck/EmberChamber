import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  memberProfileSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.panelStrong,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: 20,
    paddingBottom: 48,
    gap: 18,
    maxHeight: "90%",
  },

  memberProfileDrag: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 4,
  },

  memberProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  memberProfileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },

  memberProfileAvatarText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },

  memberProfileHeaderCopy: {
    flex: 1,
    gap: 6,
  },

  memberProfileName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  memberProfileRoleRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },

  memberProfileMeta: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
  },

  memberProfileMetaText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },

  roleBadgeOwner: {
    borderColor: "rgba(234, 111, 63, 0.45)",
    backgroundColor: "rgba(234, 111, 63, 0.12)",
  },

  roleBadgeAdmin: {
    borderColor: "rgba(168, 139, 250, 0.4)",
    backgroundColor: "rgba(168, 139, 250, 0.1)",
  },

  roleBadgeMember: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },

  roleBadgeSelf: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.successBorder,
    backgroundColor: colors.successBackground,
  },

  roleBadgeLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },

  memberActivitySection: {
    gap: 8,
  },

  memberActivityLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  memberActivityRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  memberActivityText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  memberNotesSection: {
    gap: 10,
  },

  memberNotesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  memberNotesTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  memberNotesHint: {
    color: colors.textMuted,
    fontSize: 11,
  },

  memberNotesInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: "top",
    minHeight: 80,
  },

  memberProfileActions: {
    gap: 10,
  },
});
