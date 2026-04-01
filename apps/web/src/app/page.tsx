import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { faqItems, launchPlatforms, trustFacts } from "@/lib/site";

const productPillars = [
  {
    title: "Minimal relay, not maximal central visibility",
    body: "The beta uses Cloudflare Workers, Durable Objects, D1, and R2 to move encrypted traffic without pretending modern phones can operate as an always-on pure mesh.",
  },
  {
    title: "Invite-only trusted circles",
    body: "EmberChamber is not a public network. Launch scope is DMs, small groups, encrypted attachments, and controlled onboarding.",
  },
  {
    title: "Local-first message history",
    body: "Devices keep the authoritative conversation history, local search indexes, and safety state. The relay is there to deliver, not to become your archive.",
  },
];

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pb-24 sm:pt-20">
        <div className="panel surface-grid overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div>
              <div className="eyebrow">Closed beta for trusted circles</div>
              <h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-7xl">
                Private messaging that admits the hard parts.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
                EmberChamber is being rebuilt as an invite-only encrypted messenger for
                Android, Windows, and Ubuntu. It does not pretend phones can be reliably
                serverless. It uses a minimal relay, local-first history, and explicit privacy
                boundaries instead.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/download" className="btn-primary px-6 py-3 text-base">
                  Explore launch targets
                </Link>
                <Link href="/trust-and-safety" className="btn-ghost px-6 py-3 text-base">
                  Read the trust model
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {productPillars.map((pillar) => (
                  <div key={pillar.title} className="card h-full">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{pillar.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{pillar.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="panel bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent),linear-gradient(160deg,#2a1512,#120a0b)] p-6 text-white shadow-[0_20px_60px_rgba(32,19,18,0.22)]">
              <div className="text-sm uppercase tracking-[0.22em] text-[#f8bc9c]">Beta snapshot</div>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#d7a68a]">Scope</div>
                  <p className="mt-1 text-lg font-medium">E2EE DMs, small groups, encrypted attachments</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#d7a68a]">Bootstrap</div>
                  <p className="mt-1 text-lg font-medium">Invite-only email magic links, passkeys later</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#d7a68a]">Shipping first</div>
                  <p className="mt-1 text-lg font-medium">Android, Windows, Ubuntu</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#d7a68a]">Not in beta</div>
                  <p className="mt-1 text-lg font-medium">Phone numbers, public discovery, fake “no server” claims</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-8">
          <div className="eyebrow">Launch surfaces</div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Built for the platforms you can actually ship first.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {launchPlatforms.map((platform) => (
            <div key={platform.name} className="card h-full">
              <div className="text-xs uppercase tracking-[0.2em] text-brand-600">{platform.artifact}</div>
              <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{platform.name}</h3>
              <p className="mt-2 text-sm font-medium text-brand-700">{platform.status}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{platform.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="eyebrow">Visibility boundaries</div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {trustFacts.map((fact) => (
              <div key={fact.title} className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{fact.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{fact.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="eyebrow">FAQ</div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Honest answers before the beta opens wider.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
            The first job of the public site is to explain what EmberChamber is trying to
            be, what it is deliberately not trying to be, and where the trust boundaries land.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="card">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{item.question}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
