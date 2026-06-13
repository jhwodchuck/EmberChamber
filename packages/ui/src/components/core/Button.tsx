import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: "primary" | "ghost" | "danger";
  /** Size. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Icon node rendered before the label (use a Lucide icon). */
  iconLeft?: ReactNode;
  /** Icon node rendered after the label. */
  iconRight?: ReactNode;
  children?: ReactNode;
}

/**
 * EmberChamber primary button. Fully-rounded, ember-glow primary action.
 * Primary carries the reserved ember glow; use it once per view for the main
 * action. Ghost is the glass secondary. Sizes: sm, md, lg.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  iconLeft = null,
  iconRight = null,
  onClick,
  type = "button",
  style = {},
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const sizes: Record<NonNullable<ButtonProps["size"]>, { padding: string; fontSize: string; gap: string }> = {
    sm: { padding: "0.4rem 0.85rem", fontSize: "0.8125rem", gap: "0.4rem" },
    md: { padding: "0.55rem 1.05rem", fontSize: "0.875rem", gap: "0.5rem" },
    lg: { padding: "0.75rem 1.5rem", fontSize: "1rem", gap: "0.55rem" },
  };

  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    borderRadius: "var(--radius-full)",
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? "none" : "auto",
    transition:
      "background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-default), color var(--dur-fast) var(--ease-out)",
    transform: hover && !active ? "translateY(-1px)" : "translateY(0)",
    ...sizes[size],
  };

  const variants: Record<NonNullable<ButtonProps["variant"]>, CSSProperties> = {
    primary: {
      background: active
        ? "var(--ember-700)"
        : "linear-gradient(135deg, var(--ember-400), var(--ember-600))",
      color: "var(--on-brand)",
      boxShadow: hover
        ? "0 22px 48px rgba(200,88,50,0.34), inset 0 1px 0 rgba(255,255,255,0.22)"
        : "var(--glow-ember-strong)",
    },
    ghost: {
      background: hover ? "rgba(255,255,255,0.07)" : "var(--surface)",
      color: hover ? "#fff1e8" : "var(--text-secondary)",
      borderColor: hover ? "var(--border-strong)" : "var(--border)",
      backdropFilter: "blur(var(--blur-md))",
      boxShadow: "none",
    },
    danger: {
      background: active ? "#b3372f" : hover ? "#d9483b" : "#c8453a",
      color: "#fff",
      boxShadow: "none",
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setActive(false);
      }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {iconLeft ? (
        <span style={{ display: "inline-flex", marginRight: sizes[size].gap }}>
          {iconLeft}
        </span>
      ) : null}
      {children}
      {iconRight ? (
        <span style={{ display: "inline-flex", marginLeft: sizes[size].gap }}>
          {iconRight}
        </span>
      ) : null}
    </button>
  );
}
