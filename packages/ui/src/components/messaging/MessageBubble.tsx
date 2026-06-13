import type { CSSProperties, ReactNode } from "react";

export interface MessageBubbleProps {
  children?: ReactNode;
  /** Render as the local user's outgoing message. @default false */
  own?: boolean;
  /** Sender display name (shown for incoming messages). */
  sender?: string;
  /** Timestamp label. */
  time?: string;
  style?: CSSProperties;
}

/**
 * Chat message bubble. `own` messages are ember on the right with a clipped
 * bottom-right corner; `other` messages are glass on the left. Optional
 * sender name and timestamp.
 */
export function MessageBubble({ children, own = false, sender, time, style = {} }: MessageBubbleProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: own ? "flex-end" : "flex-start",
        gap: "0.25rem",
        ...style,
      }}
    >
      {sender && !own ? (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: "var(--ember-400)",
            paddingLeft: "0.4rem",
          }}
        >
          {sender}
        </span>
      ) : null}
      <div
        style={{
          maxWidth: "min(30rem, 80%)",
          padding: "0.6rem 0.9rem",
          borderRadius: "var(--radius-2xl)",
          borderBottomRightRadius: own ? "var(--radius-sm)" : "var(--radius-2xl)",
          borderBottomLeftRadius: own ? "var(--radius-2xl)" : "var(--radius-sm)",
          fontFamily: "var(--font-sans)",
          fontSize: "0.875rem",
          lineHeight: 1.5,
          wordBreak: "break-word",
          color: own ? "var(--on-brand)" : "var(--text-primary)",
          background: own
            ? "linear-gradient(135deg, var(--ember-500), var(--ember-600))"
            : "var(--bg-secondary)",
          border: own ? "none" : "1px solid var(--border)",
          boxShadow: own ? "var(--glow-ember)" : "none",
        }}
      >
        {children}
      </div>
      {time ? (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.625rem",
            color: "var(--text-muted)",
            padding: "0 0.4rem",
          }}
        >
          {time}
        </span>
      ) : null}
    </div>
  );
}
