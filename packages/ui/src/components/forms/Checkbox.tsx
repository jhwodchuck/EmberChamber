import type { ChangeEventHandler, CSSProperties, ReactNode } from "react";

export interface CheckboxProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  id?: string;
  style?: CSSProperties;
}

/**
 * Checkbox with label — used for the adults-only (18+) affirmation and privacy
 * defaults. Controlled via `checked` / `onChange`.
 */
export function Checkbox({ label, checked = false, onChange, id, style = {} }: CheckboxProps) {
  const inputId = id || undefined;

  return (
    <label
      htmlFor={inputId}
      style={{
        display: "inline-flex",
        alignItems: "flex-start",
        gap: "0.65rem",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          marginTop: 1,
          borderRadius: "var(--radius-base)",
          border: "1px solid",
          borderColor: checked ? "var(--ember-500)" : "var(--border-input)",
          background: checked
            ? "linear-gradient(135deg, var(--ember-400), var(--ember-600))"
            : "var(--bg-input)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--on-brand)",
          transition:
            "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        }}
      >
        {checked ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
      />
      {label ? (
        <span
          style={{
            fontSize: "0.875rem",
            lineHeight: 1.5,
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </span>
      ) : null}
    </label>
  );
}
