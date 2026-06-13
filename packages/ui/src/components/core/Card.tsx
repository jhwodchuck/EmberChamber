import { useState, type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** Lift + warm border on hover. @default false */
  interactive?: boolean;
  /** CSS padding. @default "1.25rem" */
  padding?: string;
  /** Element tag. @default "div" */
  as?: ElementType;
  style?: CSSProperties;
}

/**
 * Glass card — translucent layered surface with inset highlight and soft shadow.
 * On hover (when `interactive`) it lifts and the border warms to ember.
 */
export function Card({
  children,
  interactive = false,
  padding = "1.25rem",
  as,
  style = {},
  ...rest
}: CardProps) {
  const [hover, setHover] = useState(false);
  const Tag: ElementType = as ?? "div";

  return (
    <Tag
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      style={{
        borderRadius: "var(--radius-3xl)",
        border: "1px solid",
        borderColor: hover ? "var(--border-strong)" : "var(--border)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)), var(--bg-elevated)",
        boxShadow: hover
          ? "0 28px 64px rgba(0,0,0,0.34), 0 0 0 1px rgba(255,163,104,0.06), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "var(--shadow-card)",
        backdropFilter: "blur(var(--blur-md))",
        padding,
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        transition:
          "transform var(--dur-base) var(--ease-default), border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
