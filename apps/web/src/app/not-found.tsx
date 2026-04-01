import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";

export default function NotFound() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <div className="panel px-6 py-10 sm:px-10 sm:py-12">
          <div className="eyebrow">404</div>
          <h1 className="mt-5 font-display text-5xl font-semibold text-[var(--text-primary)] sm:text-6xl">
            That page is not part of the chamber.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            The link may be stale, private, or simply not shipped yet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-primary">
              Back home
            </Link>
            <Link href="/download" className="btn-ghost">
              View launch targets
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
