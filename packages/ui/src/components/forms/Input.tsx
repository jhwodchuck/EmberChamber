import { useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the input. */
  label?: string;
  /** Leading Lucide icon node. */
  icon?: ReactNode;
  /** Error styling. @default false */
  error?: boolean;
}

/**
 * Text input — rounded glass field with ember focus ring. Optional leading icon
 * and label. Identity is pseudonymous and email is magic-link only.
 */
export function Input({
  label,
  icon = null,
  type = "text",
  id,
  error = false,
  style = {},
  ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false);
  const inputId = id || rest.name || undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
      {label ? (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </label>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          borderRadius: "var(--radius-2xl)",
          border: "1px solid",
          borderColor: error
            ? "var(--error-border)"
            : focus
              ? "var(--ember-500)"
              : "var(--border-input)",
          background: "var(--bg-input)",
          padding: "0.7rem 0.95rem",
          boxShadow: focus ? "0 0 0 2px var(--brand-soft)" : "none",
          transition:
            "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          ...style,
        }}
      >
        {icon ? (
          <span
            style={{
              display: "inline-flex",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          type={type}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            color: "var(--text-primary)",
          }}
          {...rest}
        />
      </div>
    </div>
  );
}
