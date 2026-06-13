import { useState, type CSSProperties, type ElementType, type MouseEventHandler } from "react";
import { Avatar } from "../core/Avatar";

export interface ConversationRowProps {
  name: string;
  /** Conversation type — drives the small uppercase tag. @default "dm" */
  type?: "dm" | "group" | "community" | "room";
  preview?: string;
  time?: string;
  /** Unread count badge. @default 0 */
  unread?: number;
  /** Trust/history mode — labels Local-first vs Relay-hosted. @default "device_encrypted" */
  historyMode?: "device_encrypted" | "relay_hosted";
  /** Active/selected state. @default false */
  active?: boolean;
  onClick?: MouseEventHandler;
  /** Render as a link. */
  href?: string;
  style?: CSSProperties;
}

/**
 * Conversation rail row — avatar, title, type badge, preview, timestamp, and an
 * unread count. Warms its border to ember on hover or when `active`.
 */
export function ConversationRow({
  name,
  type = "dm",
  preview,
  time,
  unread = 0,
  historyMode = "device_encrypted",
  active = false,
  onClick,
  href,
  style = {},
}: ConversationRowProps) {
  const [hover, setHover] = useState(false);
  const Tag: ElementType = href ? "a" : "button";
  const typeLabel = { dm: "DM", group: "Group", community: "Community", room: "Room" }[type] ?? "DM";

  return (
    <Tag
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        textDecoration: "none",
        cursor: "pointer",
        borderRadius: "var(--radius-3xl)",
        border: "1px solid",
        borderColor: active || hover ? "var(--ember-500)" : "var(--border)",
        background: active ? "var(--brand-soft)" : "var(--bg-secondary)",
        padding: "0.9rem 1rem",
        transition:
          "border-color var(--dur-fast) var(--ease-out), transform var(--dur-base) var(--ease-default)",
        transform: hover && !active ? "translateY(-1px)" : "translateY(0)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <Avatar name={name} size="sm" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: "0.5625rem",
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--ember-500)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "0.1rem 0.45rem",
              }}
            >
              {typeLabel}
            </span>
          </div>
          <p
            style={{
              margin: "0.4rem 0 0",
              fontFamily: "var(--font-sans)",
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {preview}
          </p>
          <p
            style={{
              margin: "0.45rem 0 0",
              fontFamily: "var(--font-sans)",
              fontSize: "0.625rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {historyMode === "device_encrypted" ? "Local-first" : "Relay-hosted"}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.5rem",
          }}
        >
          {time ? (
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.625rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {time}
            </span>
          ) : null}
          {unread > 0 ? (
            <span
              style={{
                background: "var(--ember-500)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: "0.625rem",
                fontWeight: 600,
                borderRadius: "var(--radius-full)",
                padding: "0.1rem 0.45rem",
                minWidth: "1.1rem",
                textAlign: "center",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </div>
      </div>
    </Tag>
  );
}
