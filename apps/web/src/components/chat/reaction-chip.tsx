import { clsx } from "clsx";

/**
 * A single reaction chip. Pops via the `.ec-reaction-pop` animation on mount;
 * the parent re-triggers the pop on a count change by giving it a React key that
 * includes the count (remount replays the mount animation). Web port of the
 * mobile ReactionChip.
 */
export function ReactionChip({
  emoji,
  count,
  active,
  onToggle,
}: {
  emoji: string;
  count: number;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx("ec-reaction-pop", active && "is-active")}
      style={{
        borderRadius: "var(--radius-full)",
        border: "1px solid",
        borderColor: active ? "rgba(234,111,63,0.5)" : "var(--border)",
        background: active ? "rgba(234,111,63,0.14)" : "var(--bg-primary)",
        color: active ? "var(--ember-400)" : "var(--text-secondary)",
        padding: "0.1rem 0.45rem",
        fontSize: "0.75rem",
        lineHeight: 1.4,
        cursor: "pointer",
      }}
      aria-pressed={active}
    >
      {emoji} {count}
    </button>
  );
}
