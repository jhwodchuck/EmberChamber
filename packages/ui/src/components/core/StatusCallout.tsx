import type { CSSProperties, ReactNode } from "react";

export interface StatusCalloutProps {
  children?: ReactNode;
  /** Bold heading line. */
  title?: string;
  /** Semantic tone. @default "info" */
  tone?: "info" | "success" | "warning" | "error";
  /** Optional trailing action (button, link). Rendered to the right of the body. */
  action?: ReactNode;
  style?: CSSProperties;
}

/**
 * StatusCallout — a bordered notice block for sync/relay/legacy states.
 * Tones map to the semantic ramps. Honest, calm messaging.
 */
export function StatusCallout({ children, title, tone = "info", action, style = {} }: StatusCalloutProps) {
  const tones: Record<NonNullable<StatusCalloutProps["tone"]>, { color: string; background: string; border: string }> = {
    info: {
      color: "var(--info-text)",
      background: "var(--info-bg)",
      border: "var(--info-border)",
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
  };
  const t = tones[tone] ?? tones.info;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      style={{
        borderRadius: "var(--radius-2xl)",
        border: `1px solid ${t.border}`,
        background: t.background,
        padding: "0.95rem 1.1rem",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
        }}
      >
        <div style={{ flex: 1 }}>
          {title ? (
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-sans)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: t.color,
              }}
            >
              {title}
            </p>
          ) : null}
          {children !== undefined && children !== null ? (
            <div
              style={{
                marginTop: title ? "0.35rem" : 0,
                fontFamily: "var(--font-sans)",
                fontSize: "0.8125rem",
                lineHeight: 1.55,
                color: "var(--text-secondary)",
              }}
            >
              {children}
            </div>
          ) : null}
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </div>
    </div>
  );
}
