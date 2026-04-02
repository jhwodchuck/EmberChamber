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
            Pick the path that matches what you need to do first.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            EmberChamber does not ask every visitor to do the same thing. Start with trust and
            download availability if you are evaluating the product. Use the web app for onboarding,
            messaging, search, and invite review when you want the fastest path. Move to native
            when you want the preferred primary-use surface.
          </p>
        </div>

        <div className="mt-10">
          <StartHereGuide />
        </div>
      </section>
    </MarketingShell>
  );
}
