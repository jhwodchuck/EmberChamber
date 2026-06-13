import type { CSSProperties, ReactNode } from "react";

export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  label?: ReactNode;
  id?: string;
  style?: CSSProperties;
}

/** Toggle switch for settings (notifications, local-first defaults). */
export function Switch({ checked = false, onChange, label, id, style = {} }: SwitchProps) {
  const inputId = id || undefined;

  return (
    <label
      htmlFor={inputId}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.7rem",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        id={inputId}
        onClick={() => onChange && onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          flexShrink: 0,
          borderRadius: "var(--radius-full)",
          border: "1px solid",
          borderColor: checked ? "var(--ember-500)" : "var(--border-input)",
          background: checked
            ? "linear-gradient(135deg, var(--ember-400), var(--ember-600))"
            : "var(--bg-input)",
          position: "relative",
          cursor: "pointer",
          padding: 0,
          transition:
            "background var(--dur-base) var(--ease-default), border-color var(--dur-base) var(--ease-out)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: checked ? 21 : 3,
            transform: "translateY(-50%)",
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 5px rgba(0,0,0,0.35)",
            transition: "left var(--dur-base) var(--ease-spring)",
          }}
        />
      </button>
      {label ? (
        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          {label}
        </span>
      ) : null}
    </label>
  );
}
