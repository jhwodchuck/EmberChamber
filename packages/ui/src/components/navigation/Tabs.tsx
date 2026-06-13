import type { CSSProperties } from "react";

export interface TabsProps {
  /** Tabs as strings or { value, label } objects. */
  tabs?: Array<string | { value: string; label: string }>;
  /** Selected tab value. */
  value?: string;
  onChange?: (value: string) => void;
  style?: CSSProperties;
}

/**
 * Pill tab group — the rail filters (All / Unread / Pinned / Archived) and other
 * segmented controls. Controlled via `value` / `onChange`.
 */
export function Tabs({ tabs = [], value, onChange, style = {} }: TabsProps) {
  return (
    <div
      role="tablist"
      style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", ...style }}
    >
      {tabs.map((tab) => {
        const tabValue = typeof tab === "string" ? tab : tab.value;
        const tabLabel = typeof tab === "string" ? tab : tab.label;
        const selected = tabValue === value;

        return (
          <button
            key={tabValue}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange && onChange(tabValue)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "0.4rem 0.85rem",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              border: "1px solid",
              borderColor: selected ? "var(--ember-500)" : "var(--border)",
              background: selected ? "var(--brand-soft)" : "var(--bg-secondary)",
              color: selected ? "var(--ember-500)" : "var(--text-secondary)",
              transition:
                "border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out)",
            }}
          >
            {tabLabel}
          </button>
        );
      })}
    </div>
  );
}
