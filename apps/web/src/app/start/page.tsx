import type { Metadata } from "next";
import {
  BadgeCheck,
  Compass,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
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
        <div className="cinema-panel relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-[radial-gradient(circle,rgba(255,170,110,0.16),transparent_65%)]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 glow-grid opacity-35"
            aria-hidden="true"
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div className="max-w-3xl">
              <div className="eyebrow">Start Here</div>
              <h1 className="mt-5 text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
                Pick the quickest correct path.
              </h1>
              <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
                Start with the trust model if you&apos;re evaluating
                EmberChamber. If you already have access or an invite, take the
                shortest route from here.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {["Invite-only access", "Adults-only beta"].map((item) => (
                  <div key={item} className="metric-pill">
                    <BadgeCheck
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-brand-400"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  icon: Compass,
                  label: "Evaluate",
                  body: "Review the trust model, relay boundary, and current beta scope in one pass.",
                },
                {
                  icon: ShieldCheck,
                  label: "Join",
                  body: "Invite-only onboarding and sign-in both start here without public discovery.",
                },
                {
                  icon: MonitorSmartphone,
                  label: "Continue",
                  body: "Check the posted Android and desktop builds when you want a longer-session client.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="showcase-frame rounded-[1.35rem] p-4"
                >
                  <div className="flex items-center gap-2 text-brand-400">
                    <item.icon aria-hidden="true" className="h-4 w-4" />
                    <span className="section-kicker">{item.label}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <StartHereGuide />
        </div>
      </section>
    </MarketingShell>
  );
}
