import { ChevronDown } from "lucide-react";

/**
 * Floating "jump to latest" control, shown when the conversation is scrolled
 * away from the bottom. Carries an unread badge for messages that arrived while
 * the user was scrolled up. Web port of the mobile jump-to-bottom FAB.
 */
export function JumpToBottom({
  visible,
  unreadCount,
  onClick,
}: {
  visible: boolean;
  unreadCount: number;
  onClick: () => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="ec-fade-in"
      aria-label={
        unreadCount > 0
          ? `Jump to ${unreadCount} new message${unreadCount === 1 ? "" : "s"}`
          : "Jump to latest messages"
      }
      style={{
        position: "absolute",
        right: "1.25rem",
        bottom: "1.25rem",
        zIndex: 20,
        display: "inline-flex",
        height: "2.75rem",
        width: "2.75rem",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        boxShadow: "var(--shadow-soft)",
        backdropFilter: "blur(var(--blur-md))",
        cursor: "pointer",
      }}
    >
      <ChevronDown className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span
          style={{
            position: "absolute",
            top: "-0.35rem",
            right: "-0.35rem",
            minWidth: "1.25rem",
            height: "1.25rem",
            padding: "0 0.3rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-full)",
            background: "var(--ember-500)",
            color: "#fff",
            fontSize: "0.625rem",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
