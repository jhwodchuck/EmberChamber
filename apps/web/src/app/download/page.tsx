import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { launchPlatforms } from "@/lib/site";

export const metadata: Metadata = {
  title: "Launch Targets",
  description:
    "Current EmberChamber beta targets, packaging paths, and what the browser is still responsible for.",
};

export default function DownloadPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Launch targets</div>
          <h1 className="mt-5 font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            Android first. Desktop where it helps. Browser for support and bootstrap.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            EmberChamber is not treating every surface as equal. The beta ships where the trust
            model and packaging path are defensible first, then expands from there.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {launchPlatforms.map((platform) => (
            <div key={platform.name} className="card h-full">
              <div className="text-xs uppercase tracking-[0.2em] text-brand-600">{platform.artifact}</div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{platform.name}</h2>
              <p className="mt-2 text-sm font-medium text-brand-700">{platform.status}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{platform.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="panel px-6 py-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">What the browser is for now</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              The web app is the public companion surface: positioning, invite landings, account
              recovery support, and bootstrap UI. It is not the primary launch chat runtime.
            </p>
          </div>
          <div className="panel px-6 py-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">What comes after beta</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              iPhone and macOS stay out of the first beta until the Android and desktop paths are
              stable enough to justify the extra reliability and review work.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/trust-and-safety" className="btn-primary">
            Read the trust model
          </Link>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
