import type { PrivacyBoundaryItem } from "@/lib/site";

export function PrivacyBoundaryMatrix({
  items,
}: {
  items: PrivacyBoundaryItem[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4"
        >
          <p className="section-kicker">{item.title}</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
            <p>
              <span className="font-semibold text-[var(--text-primary)]">
                Stays local:
              </span>{" "}
              {item.staysLocal}
            </p>
            <p>
              <span className="font-semibold text-[var(--text-primary)]">
                Relay role:
              </span>{" "}
              {item.relayRole}
            </p>
            <p>
              <span className="font-semibold text-[var(--text-primary)]">
                Current note:
              </span>{" "}
              {item.currentNote}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
