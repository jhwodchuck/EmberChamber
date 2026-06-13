import { StyleSheet } from "react-native";
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

export { AVATAR_SIZE, GUTTER_WIDTH };

export const bubbleStyles = StyleSheet.create({
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
