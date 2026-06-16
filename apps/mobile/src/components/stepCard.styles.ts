import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  stepCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14,
    gap: spacing[2] + 2,
    ...panelShadow,
  },

  stepNumber: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    overflow: "hidden",
  },

  stepTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  stepBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
