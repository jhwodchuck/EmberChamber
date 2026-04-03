import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ProductPreview } from "@/components/product-mockup";
import { StartHereSummary } from "@/components/start-here-guide";
import { betaScopeItems, faqItems, launchPlatforms } from "@/lib/site";

const productPillars = [
  {
    title: "A relay that delivers, not stores",
    body: "We use Cloudflare's edge to move encrypted traffic reliably. The relay routes your messages — it cannot read them. Content stays encrypted in transit and at rest on your device.",
  },
  {
    title: "Your circle, your terms",
    body: "No public profiles, no discovery feed, no strangers messaging you cold. Everyone in your circle got there because you or someone you trust let them in.",
  },
  {
    title: "Your history lives on your device",
    body: "Message history, search indexes, and private keys stay on-device. The relay handles delivery — your conversation archive is not sitting on a server.",
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
                Private messaging for your trusted circle.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
                Invite-only, end-to-end encrypted, and designed so your message history never leaves
                your device. No public feeds, no discovery, no cold messages from strangers.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/start" className="btn-primary px-6 py-3 text-base">
                  Start Here
                </Link>
                <Link href="/trust-and-safety" className="btn-ghost px-6 py-3 text-base">
                  Read Trust Model
                </Link>
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
                Already in the beta?{" "}
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  Sign in
                </Link>
                . Looking for a native build?{" "}
                <Link href="/download" className="font-medium text-brand-600 hover:underline">
                  Check downloads
                </Link>
                .
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {productPillars.map((pillar) => (
                  <div key={pillar.title} className="card h-full">
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">{pillar.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{pillar.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <StartHereSummary />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="order-2 lg:order-1">
            <ProductPreview />
          </div>
          <div className="order-1 lg:order-2">
            <div className="eyebrow">The experience</div>
            <h2 className="mt-4 font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              A quieter, more intentional inbox.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              Most messaging apps are optimised for engagement. EmberChamber is optimised for
              the people you actually want to hear from.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                "No cold messages from people outside your circle",
                "No algorithmic feed deciding what you see first",
                "No server storing a searchable copy of your history",
                "No public profile to maintain or be discovered through",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-600 text-xs font-bold">✓</span>
                  <span className="text-sm leading-6 text-[var(--text-secondary)]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div>
            <div className="eyebrow">Design decisions</div>
            <h2 className="mt-4 font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              Intentionally smaller. Intentionally private.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
              Most messaging apps optimise for growth. EmberChamber is optimised for trust.
              These three constraints are features, not limitations.
            </p>
          </div>
          <div className="grid gap-4">
            <div className="card">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Invite-only, always</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                No public registration. No discovery feed. No cold messages from strangers.
                Your inbox stays clean because only people you trust — or people they vouch for — can reach you.
              </p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Your history is yours</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Conversations, search indexes, and private keys live on your device. We can&apos;t search them,
                sell them, or lose them in a server breach. Delete the app and that history is gone — not
                sitting in a database somewhere.
              </p>
            </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Built for real circles</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Adults-only by design — not as a restriction, but as a social decision. Private adult
                relationships need tighter trust boundaries, calmer moderation, and fewer exposure
                risks than any public social platform can offer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-8">
          <div className="eyebrow">Native clients</div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Android, Windows, and Ubuntu first.
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
          <div className="eyebrow">Beta scope</div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-[var(--text-primary)]">
            What&apos;s live right now.
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {betaScopeItems.map((item) => (
              <div key={item.feature} className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${
                      item.status === "live" ? "bg-green-500" : "bg-[var(--border)]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${
                      item.status === "live" ? "text-green-600 dark:text-green-400" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {item.status === "live" ? "Live" : "Planned"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.feature}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{item.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            Full trust model and relay visibility boundaries —{" "}
            <a href="/trust-and-safety" className="font-medium text-brand-600 hover:underline">read the trust page</a>.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="eyebrow">FAQ</div>
          <h2 className="mt-4 font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Honest answers before the beta opens wider.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
            The beta is narrow on purpose. These are the honest answers.
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
