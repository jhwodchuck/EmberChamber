import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";
import { StyleSheet } from "react-native";
import { theme } from "../styles";

// Co-located layout for the polished conversation surface: the animated typing
// indicator and the jump-to-bottom FAB. Kept out of the shared src/styles.ts
// monolith so the polish work can iterate independently. Colors come from the
// shared theme so this stays in lockstep with the design tokens.


const FAB_SIZE = 44;

export const conversationScreenStyles = StyleSheet.create({
  // Row that pairs the animated dots with the existing "… is typing" copy.
  typingBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  // Absolutely positioned just above the composer, anchored bottom-right.
  scrollToEndFab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceStrong,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  scrollToEndFabPressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollToEndFabIcon: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  conversationShell: {
    flex: 1,
    minHeight: 0,
    gap: 12,
  },
  conversationHeader: {
    gap: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  backButtonLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  conversationHeaderCopy: {
    gap: 4,
  },
  conversationTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  conversationSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  conversationMessages: {
    flex: 1,
    minHeight: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 12,
  },
  conversationMessagesContent: {
    gap: 10,
    paddingBottom: 8,
  },
  typingBanner: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  typingBannerText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  conversationTopBar: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 8,
    paddingBottom: 2,
  },
  conversationIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  conversationAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  conversationAvatarText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  conversationOverflowButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  conversationOverflowLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  conversationLoadingState: {
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  dateSeparator: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dateSeparatorLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});
