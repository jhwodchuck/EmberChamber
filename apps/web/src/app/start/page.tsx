import type { Metadata } from "next";
import { Compass, MonitorSmartphone, ShieldCheck } from "lucide-react";
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
        <div className="section-spotlight relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-[radial-gradient(circle,rgba(255,170,110,0.16),transparent_65%)]"
            aria-hidden="true"
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
            <div className="max-w-3xl">
              <div className="eyebrow">Start Here</div>
              <h1 className="mt-5 text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
                New here, or ready to join?
              </h1>
              <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
                EmberChamber is invite-only. Start with the trust model if you&apos;re evaluating it
                for your circle, or pick the quickest path if you already have an invite or account.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                {
                  icon: Compass,
                  label: "Web First",
                  body: "Use the browser for onboarding, invite review, and first contact.",
                },
                {
                  icon: ShieldCheck,
                  label: "Invite-Only",
                  body: "No public registration path and no discovery feed.",
                },
                {
                  icon: MonitorSmartphone,
                  label: "Native Later",
                  body: "Move to Android or desktop when you want the primary daily surface.",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-2 text-brand-400">
                    <item.icon aria-hidden="true" className="h-4 w-4" />
                    <span className="section-kicker">{item.label}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
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
