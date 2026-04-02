import type { ReactNode } from "react";

export function RecoveryPanel({
  eyebrow,
  statusCode,
  title,
  description,
  children,
}: {
  eyebrow: string;
  statusCode?: string | number;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <div className="panel px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="eyebrow">{eyebrow}</div>
          {statusCode ? (
            <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              HTTP {statusCode}
            </span>
          ) : null}
        </div>
        <h1 className="mt-5 text-balance font-display text-5xl font-semibold text-[var(--text-primary)] sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">{description}</p>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
