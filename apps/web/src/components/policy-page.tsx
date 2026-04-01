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
      <section className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
        <div className="panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">{intro}</p>

          <div className="prose-block mt-10 space-y-8">{children}</div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary">
              Back to EmberChamber
            </Link>
            <Link href="/download" className="btn-ghost">
              Launch targets
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
