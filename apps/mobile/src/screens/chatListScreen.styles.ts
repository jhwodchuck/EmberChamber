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
});
