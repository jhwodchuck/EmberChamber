import { StyleSheet, Platform } from "react-native";
import { theme } from "../styles";

// Co-located styles for the redesigned message bubble (grouped runs, avatar
// gutter, tails, footer meta). Kept out of the shared src/styles.ts monolith so
// the polish work can evolve the bubble independently. Colors come from the
// shared theme so this stays in lockstep with the design tokens.
const colors = theme.colors;

const AVATAR_SIZE = 28;
const GUTTER_WIDTH = AVATAR_SIZE + 6;
const TAIL_RADIUS = 5;
const ROUND_RADIUS = 18;

// Swipe-to-reply tuning. The bubble has to travel past REPLY_THRESHOLD to fire
// the reply (and the threshold haptic); REPLY_MAX_TRAVEL softly caps how far the
// finger can drag the bubble so it never slides off-screen.
const REPLY_THRESHOLD = 64;
const REPLY_MAX_TRAVEL = 96;

export { AVATAR_SIZE, GUTTER_WIDTH, REPLY_THRESHOLD, REPLY_MAX_TRAVEL };

export const bubbleStyles = StyleSheet.create({
  // Positioning context for the swipe-to-reply hint, which sits behind the
  // translating row. Margins live here so grouping spacing stays put while the
  // inner row slides.
  swipeContainer: {
    position: "relative",
    width: "100%",
  },
  // Reply arrow revealed behind the bubble as it slides toward the reply edge.
  replyHint: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  replyHintIncoming: {
    left: 0,
  },
  replyHintOwn: {
    right: 0,
  },
  replyHintIcon: {
    color: colors.textSoft,
    fontSize: 20,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
    gap: 6,
  },
  rowOwn: {
    justifyContent: "flex-end",
  },
  // First message of a run gets breathing room; grouped continuations tuck in.
  rowFirstInGroup: {
    marginTop: 10,
  },
  rowGrouped: {
    marginTop: 2,
  },
  gutter: {
    width: GUTTER_WIDTH,
    alignItems: "flex-start",
    justifyContent: "flex-end",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: ROUND_RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 5,
  },
  bubbleOwn: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.brandSoft,
  },
  // Tail: the corner nearest the speaker is squared off on the last message of a
  // run, matching the Telegram/Signal silhouette without needing SVG cutouts.
  bubbleIncomingTail: {
    borderBottomLeftRadius: TAIL_RADIUS,
  },
  bubbleOwnTail: {
    borderBottomRightRadius: TAIL_RADIUS,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 1,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    marginTop: 1,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  footerTextOwn: {
    color: colors.textSoft,
  },
  ticks: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 1,
  },
  tick: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
  },
  // The second tick (read) sits slightly tucked under the first so the pair
  // reads as a single ✓✓ glyph as it animates in.
  tickSecond: {
    marginLeft: -3,
  },
});


export const styles = StyleSheet.create({
  inlineBold: {
    fontWeight: "700",
  },

  inlineItalic: {
    fontStyle: "italic",
  },

  inlineStrikethrough: {
    textDecorationLine: "line-through",
  },

  inlineLink: {
    color: colors.textSoft,
    textDecorationLine: "underline",
    textDecorationColor: colors.textSoft,
  },

  inlineMention: {
    color: colors.textSoft,
    fontWeight: "700",
  },

  inlineCode: {
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: colors.textSoft,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 14,
  },

  inlineSpoiler: {
    borderRadius: 6,
    backgroundColor: colors.brandMuted,
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 6,
    overflow: "hidden",
  },

  inlineSpoilerRevealed: {
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: colors.textPrimary,
    paddingHorizontal: 6,
    overflow: "hidden",
  },

  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: colors.borderStrong,
    backgroundColor: colors.inputBackground,
    paddingLeft: 12,
    paddingVertical: 8,
    paddingRight: 10,
    borderRadius: 12,
  },

  quoteText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },

  codeBlock: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  codeBlockText: {
    color: colors.textSoft,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    fontSize: 13,
    lineHeight: 19,
  },

  attachmentMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  messageImage: {
    width: "100%",
    minHeight: 220,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
  },

  attachmentActionGroup: {
    gap: 8,
  },

  attachmentActionButton: {
    alignSelf: "flex-start",
    minWidth: 148,
  },

  systemMessageCard: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  systemMessageText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  formattedMessage: {
    gap: 8,
  },

  messageDeletedText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 20,
  },

  messageReplyPreview: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  messageReplyAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },

  messageReplyCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  messageReplySender: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },

  messageReplyText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  messageReactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 2,
  },

  messageReactionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  messageReactionChipActive: {
    borderColor: colors.brand,
    backgroundColor: "rgba(250,204,21,0.16)",
  },

  messageReactionText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },

  messageMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  messageText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
});
