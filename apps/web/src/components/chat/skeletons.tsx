import { clsx } from "clsx";
import type { CSSProperties } from "react";

/**
 * Skeleton shimmer placeholder. A muted block with a highlight band sweeping
 * across it (`.ec-shimmer`, defined in globals.css). Web port of the mobile
 * Shimmer; honors prefers-reduced-motion by rendering a static block.
 */
export function Shimmer({
  width,
  height,
  radius = 8,
  className,
  style,
}: {
  width: number | string;
  height: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={clsx("ec-shimmer", className)}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton mirroring a chat-rail row — circular avatar plus a title and preview
 * line. Fills the conversation rail while previews load.
 */
export function SkeletonChatRow() {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        borderRadius: "1.4rem",
        border: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        padding: "0.9rem 1rem",
      }}
    >
      <Shimmer width={40} height={40} radius={9999} />
      <div style={{ flex: 1, minWidth: 0, display: "grid", gap: "0.5rem" }}>
        <Shimmer width="62%" height={12} radius={6} />
        <Shimmer width="88%" height={10} radius={5} />
      </div>
    </div>
  );
}

/**
 * Skeleton mirroring a chat message bubble. Alternating own/incoming alignment
 * fills the conversation while history loads.
 */
export function SkeletonMessage({ own = false }: { own?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: own ? "flex-end" : "flex-start",
      }}
    >
      <Shimmer
        width={own ? "46%" : "58%"}
        height={own ? 40 : 52}
        radius={18}
      />
    </div>
  );
}
