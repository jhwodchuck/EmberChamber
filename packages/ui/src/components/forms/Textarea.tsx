import { useState, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  rows?: number;
}

/** Multi-line text field matching Input styling. Used for invite notes / messages. */
export function Textarea({ label, id, rows = 4, style = {}, ...rest }: TextareaProps) {
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
      <textarea
        id={inputId}
        rows={rows}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          borderRadius: "var(--radius-2xl)",
          border: "1px solid",
          borderColor: focus ? "var(--ember-500)" : "var(--border-input)",
          background: "var(--bg-input)",
          padding: "0.7rem 0.95rem",
          fontFamily: "var(--font-sans)",
          fontSize: "0.875rem",
          lineHeight: 1.55,
          color: "var(--text-primary)",
          outline: "none",
          resize: "vertical",
          boxShadow: focus ? "0 0 0 2px var(--brand-soft)" : "none",
          transition:
            "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}
