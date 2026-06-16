import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";
import { StyleSheet } from "react-native";

// Co-located layout for the chat-list loading skeleton. Kept out of the shared
// src/styles.ts monolith so the polish work can iterate independently. The
// skeleton rows themselves carry their own (theme-derived) styling inside
// SkeletonChatRow; this file only spaces the stack of placeholder rows to match
// styles.chatListContent (gap: 4).
export const chatListScreenStyles = StyleSheet.create({
  skeletonList: {
    gap: 4,
  },
  chatRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14,
  },
  chatRowActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatAvatarText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  chatRowCopy: {
    flex: 1,
    gap: 6,
  },
  chatRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chatRowTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  chatRowTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  chatRowPreview: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  chatMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  chatRowMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  chatBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chatBadgeText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  unreadBadge: {
    borderRadius: 999,
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  unreadBadgeText: {
    color: "#1b0d08",
    fontSize: 11,
    fontWeight: "800",
  },
  chatRowShell: {
    position: "relative",
    marginBottom: 4,
    overflow: "hidden",
    borderRadius: 18,
  },
  chatRowActions: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "stretch",
  },
  chatActionButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    paddingHorizontal: 8,
  },
  chatActionButtonMuted: {
    backgroundColor: "#2d3748",
  },
  chatActionButtonPinned: {
    backgroundColor: "#44380c",
  },
  chatActionButtonArchived: {
    backgroundColor: "#1a2430",
  },
  chatActionLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  chatRowAnimated: {
    backgroundColor: colors.background,
    borderRadius: 18,
  },
  chatRowTitleUnread: {
    color: "#ffffff",
    fontWeight: "800",
  },
  chatRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatRowTimeUnread: {
    color: colors.textSoft,
  },
  chatStateLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  chatRowPreviewUnread: {
    color: colors.textPrimary,
  },
  chatListContent: {
    gap: 4,
    paddingBottom: 24,
  },
  chatWorkspaceShell: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    flexDirection: "row",
    gap: 12,
  },
  chatWorkspaceListPane: {
    flex: 0.95,
    minWidth: 320,
    maxWidth: 420,
    minHeight: 0,
  },
  chatWorkspaceDetailPane: {
    flex: 1.35,
    minHeight: 0,
    minWidth: 0,
  },
  chatWorkspaceEmptyPane: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 24,
    justifyContent: "center",
    gap: 10,
  },
  chatWorkspaceEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  chatWorkspaceEmptyBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 420,
  },
});
