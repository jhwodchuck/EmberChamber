import type { CSSProperties, ReactNode } from "react";

export interface BadgeProps {
  children?: ReactNode;
  /** Semantic tone. @default "neutral" */
  tone?: "neutral" | "accent" | "success" | "warning" | "error" | "info";
  /** Prefix a small status dot. @default false */
  dot?: boolean;
  style?: CSSProperties;
}

/**
 * Small status/label pill. Tones map to the semantic ramps; `accent` is ember.
 * Use `dot` to prefix a status dot.
 */
export function Badge({ children, tone = "neutral", dot = false, style = {} }: BadgeProps) {
  const tones: Record<NonNullable<BadgeProps["tone"]>, { color: string; background: string; border: string }> = {
    neutral: {
      color: "var(--text-secondary)",
      background: "var(--surface)",
      border: "var(--border)",
    },
    accent: {
      color: "var(--ember-300)",
      background: "var(--brand-muted)",
      border: "var(--border-strong)",
    },
    success: {
      color: "var(--success-text)",
      background: "var(--success-bg)",
      border: "var(--success-border)",
    },
    warning: {
      color: "var(--warning-text)",
      background: "var(--warning-bg)",
      border: "var(--warning-border)",
    },
    error: {
      color: "var(--error-text)",
      background: "var(--error-bg)",
      border: "var(--error-border)",
    },
    info: {
      color: "var(--info-text)",
      background: "var(--info-bg)",
      border: "var(--info-border)",
    },
  };
  const t = tones[tone] ?? tones.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        fontFamily: "var(--font-sans)",
        fontSize: "0.625rem",
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "0.25rem 0.6rem",
        borderRadius: "var(--radius-full)",
        color: t.color,
        background: t.background,
        border: `1px solid ${t.border}`,
        ...style,
      }}
    >
      {dot ? (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "currentColor",
          }}
        />
      ) : null}
      {children}
    </span>
  );
}
