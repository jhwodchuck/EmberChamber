import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (required — icon-only control). */
  label: string;
  /** Toggled / selected state. @default false */
  active?: boolean;
  size?: "sm" | "md" | "lg";
  /** A Lucide icon node. */
  children?: ReactNode;
}

/**
 * Square, rounded icon-only button for rails and toolbars (pin, mute, refresh).
 * Subtle by default; warms to ember on hover or when `active`.
 */
export function IconButton({
  children,
  label,
  active = false,
  size = "md",
  onClick,
  style = {},
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const dims = { sm: 30, md: 36, lg: 42 }[size];

  const css: CSSProperties = {
    width: dims,
    height: dims,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius-full)",
    border: "1px solid",
    borderColor: active || hover ? "var(--border-strong)" : "transparent",
    background: active ? "var(--brand-soft)" : hover ? "var(--surface)" : "transparent",
    color: active || hover ? "var(--ember-500)" : "var(--text-secondary)",
    cursor: "pointer",
    transition:
      "background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
    ...style,
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={css}
      {...rest}
    >
      {children}
    </button>
  );
}
