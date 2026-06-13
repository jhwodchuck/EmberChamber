import { useState, type CSSProperties, type ReactNode, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  /** Options as strings or { value, label } objects. */
  options?: Array<string | { value: string; label: string }>;
  children?: ReactNode;
}

/** Rounded glass select with a custom chevron. Pass `options` or children. */
export function Select({ label, id, options = [], children, style = {}, ...rest }: SelectProps) {
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
      <div style={{ position: "relative", display: "flex" }}>
        <select
          id={inputId}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            width: "100%",
            borderRadius: "var(--radius-2xl)",
            border: "1px solid",
            borderColor: focus ? "var(--ember-500)" : "var(--border-input)",
            background: "var(--bg-input)",
            padding: "0.7rem 2.4rem 0.7rem 0.95rem",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            color: "var(--text-primary)",
            outline: "none",
            cursor: "pointer",
            boxShadow: focus ? "0 0 0 2px var(--brand-soft)" : "none",
            transition:
              "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
            ...style,
          }}
          {...rest}
        >
          {children ??
            options.map((opt) => {
              const value = typeof opt === "string" ? opt : opt.value;
              const text = typeof opt === "string" ? opt : opt.label;
              return (
                <option key={value} value={value}>
                  {text}
                </option>
              );
            })}
        </select>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "0.95rem",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "var(--text-muted)",
            display: "inline-flex",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
