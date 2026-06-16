import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  statusCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 6,
  },

  statusCardWarning: {
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningBackground,
  },

  statusCardError: {
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorBackground,
  },

  statusCardSuccess: {
    borderColor: colors.successBorder,
    backgroundColor: colors.successBackground,
  },

  statusTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  statusBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  statusActionButton: {
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
    marginTop: 2,
  },

  statusActionLabel: {
    color: colors.errorText,
    fontSize: 12,
    fontWeight: "700",
  },
});
