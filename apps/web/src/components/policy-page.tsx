import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

export function PolicyPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="cinema-panel relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,rgba(255,170,110,0.16),transparent_62%)]"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 glow-grid opacity-35" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div>
              <div className="eyebrow">{eyebrow}</div>
              <h1 className="mt-5 max-w-3xl text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">{intro}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                "Write the boundary plainly.",
                "Keep the trust model specific.",
                "Do not hide operational reality.",
              ].map((item) => (
                <div
                  key={item}
                  className="showcase-frame rounded-[1.35rem] px-4 py-4 text-sm leading-6 text-[#d5b5a7]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="cinema-panel h-fit rounded-[2rem] px-6 py-6 lg:sticky lg:top-28">
            <p className="section-kicker">Short Version</p>
            <p className="mt-4 text-balance font-display text-3xl font-semibold text-[var(--text-primary)]">
              This page exists to define the product boundary, not to soften it.
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              EmberChamber is private by design, but it is not a fantasy system with no operator
              obligations or no platform rules.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link href="/" className="btn-primary">
                Back to Home
              </Link>
              <Link href="/support" className="btn-ghost">
                Need Support
              </Link>
            </div>
          </aside>

          <div className="prose-block grid gap-5">{children}</div>
        </div>
      </section>
    </MarketingShell>
  );
}
