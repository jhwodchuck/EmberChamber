import { StyleSheet } from "react-native";
import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";

export const styles = StyleSheet.create({
  locationCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    overflow: "hidden",
  },

  locationMapFrame: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: colors.inputBackground,
  },

  locationMapImage: {
    width: "100%",
    height: "100%",
  },

  locationMapMarker: {
    position: "absolute",
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: colors.brand,
  },

  locationCardBody: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },

  locationTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },

  locationDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },

  locationActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },

  locationActionLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },

  locationAttribution: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "right",
  },
});
