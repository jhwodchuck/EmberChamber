import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  conversationComposer: {
    flexShrink: 0,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 12,
  },

  composerInputCompact: {
    minHeight: 86,
    textAlignVertical: "top",
  },

  composerActionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  composerSendButton: {
    minWidth: 92,
  },

  composerDock: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },

  composerAttachColumn: {
    flexDirection: "column",
    gap: 6,
    flexShrink: 0,
  },

  composerAttachButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },

  composerAttachLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },

  composerInputDocked: {
    flex: 1,
    minHeight: 40,
    maxHeight: 140,
    textAlignVertical: "top",
    paddingTop: 9,
    paddingBottom: 9,
    paddingHorizontal: 4,
  },

  composerSendButtonDocked: {
    minWidth: 64,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    flexShrink: 0,
  },

  composerSendButtonLabel: {
    color: "#1b0d08",
    fontSize: 14,
    fontWeight: "800",
  },

  composerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },

  composerIconButtonDisabled: {
    opacity: 0.4,
  },

  composerIconLabel: {
    fontSize: 17,
    lineHeight: 20,
  },

  composerFormatLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },

  composerSendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
    flexShrink: 0,
    marginBottom: 2,
  },

  composerSendCircleDisabled: {
    opacity: 0.45,
  },

  composerSendIcon: {
    color: "#1b0d08",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
});
