import type { CSSProperties, ReactNode } from "react";

export interface ChipProps {
  children?: ReactNode;
  /** Leading Lucide icon node (rendered ember). */
  icon?: ReactNode;
  style?: CSSProperties;
}

/**
 * Info chip / metric pill — small rounded glass token used in hero signal rows
 * and platform cards. Optional leading `icon`.
 */
export function Chip({ children, icon = null, style = {} }: ChipProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "var(--font-sans)",
        fontSize: "0.75rem",
        fontWeight: 500,
        padding: "0.4rem 0.75rem",
        borderRadius: "var(--radius-full)",
        color: "var(--text-secondary)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        ...style,
      }}
    >
      {icon ? (
        <span style={{ display: "inline-flex", color: "var(--ember-400)" }}>
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
