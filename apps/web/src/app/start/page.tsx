import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { StartHereGuide } from "@/components/start-here-guide";

export const metadata: Metadata = {
  title: "Start Here",
  description:
    "Choose the right EmberChamber entry path for evaluation, beta onboarding, sign-in, downloads, or support.",
};

export default function StartPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="max-w-3xl">
          <div className="eyebrow">Start Here</div>
          <h1 className="mt-5 text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            New here, or ready to join?
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            EmberChamber is invite-only. Browse below if you&apos;re evaluating whether it&apos;s right for
            your circle — or pick your path directly if you already have an invite or account.
          </p>
        </div>

        <div className="mt-10">
          <StartHereGuide />
        </div>
      </section>
    </MarketingShell>
  );
}
