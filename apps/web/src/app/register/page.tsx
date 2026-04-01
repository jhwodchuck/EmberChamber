import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: "Join Beta",
  description: "Start invite-only EmberChamber beta onboarding with a private email bootstrap.",
};

export default function RegisterPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_28rem] lg:items-start">
        <div className="max-w-2xl">
          <div className="eyebrow">Invite-only onboarding</div>
          <h1 className="mt-5 font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            Join the beta deliberately, not through public discovery.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            New accounts require an invite token, a private email bootstrap, and a named first
            device. The current beta direction is small, trusted circles rather than open-network
            growth mechanics.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Scope at launch</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                E2EE DMs, small groups, encrypted attachments, local search, and limited multi-device support.
              </p>
            </div>
            <div className="card">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Explicitly out of scope</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Public usernames, discovery feeds, phone-number matching, and “uncensorable forever” claims.
              </p>
            </div>
          </div>
        </div>

        <RegisterForm />
      </section>
    </MarketingShell>
  );
}
