import type { CSSProperties } from "react";

export interface TrustBadgeProps {
  /** Trust state. @default "secure" */
  state?: "secure" | "hosted";
  /** Override the default label ("Secure" / "Hosted"). */
  label?: string;
  style?: CSSProperties;
}

/**
 * Trust-state badge — the brand's honest secure-vs-hosted signal.
 * `secure` = E2EE DMs / device-encrypted groups (local-first).
 * `hosted` = relay-hosted or legacy compatibility history.
 */
export function TrustBadge({ state = "secure", label, style = {} }: TrustBadgeProps) {
  const secure = state === "secure";
  const text = label ?? (secure ? "Secure" : "Hosted");

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        fontFamily: "var(--font-sans)",
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "0.3rem 0.7rem",
        borderRadius: "var(--radius-full)",
        color: secure ? "var(--trust-secure-text)" : "var(--trust-hosted-text)",
        background: secure ? "var(--trust-secure-bg)" : "var(--trust-hosted-bg)",
        border: `1px solid ${secure ? "var(--trust-secure-border)" : "var(--trust-hosted-border)"}`,
        ...style,
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {secure ? (
          <>
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </>
        ) : (
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        )}
      </svg>
      {text}
    </span>
  );
}
