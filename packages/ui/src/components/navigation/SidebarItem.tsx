import { useState, type CSSProperties, type ElementType, type MouseEventHandler, type ReactNode } from "react";

export interface SidebarItemProps {
  children?: ReactNode;
  /** Leading Lucide icon node. */
  icon?: ReactNode;
  /** Active/selected state. @default false */
  active?: boolean;
  /** Render as a link. */
  href?: string;
  onClick?: MouseEventHandler;
  /** Trailing node (badge, count). */
  trailing?: ReactNode;
  style?: CSSProperties;
}

/**
 * Workspace nav item — icon + label row that turns ember-soft when `active`.
 * Renders as an anchor when `href` is given, else a button.
 */
export function SidebarItem({
  children,
  icon = null,
  active = false,
  href,
  onClick,
  trailing = null,
  style = {},
}: SidebarItemProps) {
  const [hover, setHover] = useState(false);
  const Tag: ElementType = href ? "a" : "button";

  return (
    <Tag
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        width: "100%",
        textAlign: "left",
        textDecoration: "none",
        border: "none",
        cursor: "pointer",
        borderRadius: "var(--radius-2xl)",
        padding: "0.6rem 0.8rem",
        fontFamily: "var(--font-sans)",
        fontSize: "0.875rem",
        fontWeight: active ? 600 : 500,
        color: active
          ? "var(--ember-500)"
          : hover
            ? "var(--text-primary)"
            : "var(--text-secondary)",
        background: active
          ? "var(--brand-soft)"
          : hover
            ? "var(--bg-secondary)"
            : "transparent",
        transition:
          "background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
        ...style,
      }}
    >
      {icon ? (
        <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {trailing}
    </Tag>
  );
}
