import type { CSSProperties } from "react";

export interface AvatarProps {
  /** Image source. When omitted, warm ember initials are rendered. */
  src?: string | null;
  /** Pseudonymous display name — initials are derived from it. */
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  style?: CSSProperties;
}

/**
 * Pseudonymous identity avatar. Renders an image when `src` is given, otherwise
 * warm ember initials. Identity is pseudonymous — initials come from a display name.
 */
export function Avatar({ src = null, name = "", size = "md", style = {} }: AvatarProps) {
  const dims = { sm: 32, md: 40, lg: 48, xl: 64 }[size];
  const font = { sm: 12, md: 14, lg: 16, xl: 22 }[size];

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const base: CSSProperties = {
    width: dims,
    height: dims,
    borderRadius: "var(--radius-full)",
    flexShrink: 0,
    ...style,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={dims}
        height={dims}
        loading="lazy"
        style={{ ...base, objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      style={{
        ...base,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: font,
        color: "var(--ember-500)",
        background: "var(--brand-soft)",
      }}
    >
      {initials}
    </div>
  );
}
