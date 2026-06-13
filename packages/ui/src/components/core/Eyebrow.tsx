import type { CSSProperties, ReactNode } from "react";

export interface EyebrowProps {
  children?: ReactNode;
  /** Capsule pill or bare kicker text. @default "pill" */
  variant?: "pill" | "kicker";
  style?: CSSProperties;
}

/**
 * Eyebrow — the small rounded uppercase label that opens a section.
 * `pill` (default) draws the glass capsule; `kicker` is bare ember text.
 */
export function Eyebrow({ children, variant = "pill", style = {} }: EyebrowProps) {
  if (variant === "kicker") {
    return (
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "0.6875rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-eyebrow)",
          color: "var(--ember-400)",
          ...style,
        }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontFamily: "var(--font-sans)",
        fontSize: "0.75rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-eyebrow)",
        color: "var(--ember-300)",
        background: "var(--brand-muted)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-full)",
        padding: "0.35rem 0.85rem",
        backdropFilter: "blur(var(--blur-sm))",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
