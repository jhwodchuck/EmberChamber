import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  attachMenuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.panelStrong,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 14,
  },

  attachCameraPreview: {
    marginHorizontal: 16,
    height: 170,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surface,
    position: "relative",
  },

  attachCameraPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  attachCameraPlaceholderIcon: {
    fontSize: 40,
  },

  attachCameraPlaceholderLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  attachCameraHintBadge: {
    position: "absolute",
    bottom: 10,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  attachCameraHintText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  attachGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },

  attachGridTile: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },

  attachGridIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  attachGridIconText: {
    fontSize: 24,
  },

  attachGridLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  attachSubSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.panelStrong,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingBottom: 32,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 16,
    maxHeight: "85%",
  },

  attachSubSheetTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  attachSubSheetScroll: {
    maxHeight: 340,
  },

  attachSubSheetInput: {
    marginBottom: 10,
  },

  attachSubSheetOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 12,
  },

  attachSubSheetOptionIcon: {
    fontSize: 24,
    lineHeight: 28,
  },

  attachSubSheetOptionCopy: {
    gap: 3,
  },

  attachSubSheetOptionLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  attachSubSheetOptionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  attachDurationRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },

  attachDurationChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
  },

  attachDurationChipActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },

  attachDurationChipLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  attachDurationChipLabelActive: {
    color: colors.textSoft,
  },

  attachPollOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  attachPollRemove: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },

  attachPollRemoveLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  attachCheckPrefix: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 44,
    flexShrink: 0,
  },
});
