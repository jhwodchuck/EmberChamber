import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Request a private email magic link for EmberChamber beta access.",
};

export default function LoginPage() {
  return (
    <MarketingShell>
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_28rem] lg:items-start">
        <div className="max-w-2xl">
          <div className="eyebrow">Email bootstrap</div>
          <h1 className="mt-5 font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            Sign in without turning your identity into a contact graph.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            EmberChamber uses private email magic links for bootstrap and recovery. Email is not
            intended to be public, searchable, or used as a discovery mechanism.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">What this page is for</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Bootstrap an account session, name the current device, and move toward passkeys later
                when the beta flow is fully wired.
              </p>
            </div>
            <div className="card">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">What it is not for</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Public directory lookups, social graph imports, or phone-number identity.
              </p>
            </div>
          </div>
        </div>

        <LoginForm />
      </section>
    </MarketingShell>
  );
}
