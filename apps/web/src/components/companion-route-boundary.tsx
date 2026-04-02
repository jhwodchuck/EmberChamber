import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatusCallout } from "@/components/status-callout";

type BoundaryAction = {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

export function CompanionRouteBoundary({
  actions,
  description,
  eyebrow,
  reasonBody,
  reasonTitle,
  title,
}: {
  actions: readonly [BoundaryAction, ...BoundaryAction[]];
  description: string;
  eyebrow: string;
  reasonBody: string;
  reasonTitle: string;
  title: string;
}) {
  const [primaryAction, ...secondaryActions] = actions;

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <section className="panel overflow-hidden px-6 py-7 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="mt-5 max-w-3xl text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              {title}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>

          <aside className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent),linear-gradient(160deg,#2a1512,#120a0b)] p-5 text-white shadow-[0_20px_60px_rgba(32,19,18,0.22)]">
            <p className="text-sm uppercase tracking-[0.2em] text-[#f8bc9c]">Best next step</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[#f3ddd3]">
              <p>{primaryAction.description}</p>
              <p>
                The browser remains the companion surface for invite review, settings, recovery, and session control.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <Link href={primaryAction.href} className="btn-primary w-full">
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {secondaryActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="btn-ghost w-full border-white/15 bg-white/5 text-white hover:text-white"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <StatusCallout tone="warning" title={reasonTitle}>
        {reasonBody}
      </StatusCallout>

      <section className="grid gap-5 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className="panel px-6 py-7 transition-colors hover:border-brand-500"
            >
              <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <p className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{action.label}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                {action.description}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
