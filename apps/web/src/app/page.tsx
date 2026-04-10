import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Cloud,
  Download,
  LockKeyhole,
  MonitorSmartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { ProductPreview } from "@/components/product-mockup";
import { StartHereSummary } from "@/components/start-here-guide";
import {
  betaScopeItems,
  faqItems,
  launchPlatforms,
  trustFacts,
} from "@/lib/site";

const heroSignals = [
  "Invite-only access",
  "No public discovery surface",
  "Adults-only beta boundary",
];

const liveTodayCards = [
  {
    title: "Direct messages are live",
    body: "Encrypted mailbox delivery works across the active beta surfaces, with DM history staying local to the device.",
    icon: LockKeyhole,
  },
  {
    title: "New groups start device-encrypted",
    body: "Older relay-hosted compatibility history still exists, but new groups no longer depend on relay-hosted history reads.",
    icon: Users,
  },
  {
    title: "Invite-only onboarding is live",
    body: "Magic-link access, adults-only confirmation, and device naming now happen in a short staged flow.",
    icon: Sparkles,
  },
];

const launchAccent = {
  android: "from-brand-500/18 via-brand-500/5 to-transparent",
  windows: "from-sky-300/14 via-sky-200/4 to-transparent",
  ubuntu: "from-amber-300/14 via-amber-200/4 to-transparent",
} as const;

const launchSignals = {
  android: [
    "Installable daily client",
    "Local SQLite cache",
    "Native device integration",
  ],
  windows: ["Long sessions", "Native desktop shell", "Full beta surface"],
  ubuntu: ["Linux packaging", "Operator friendly", "Desktop-first flow"],
} as const;

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="relative px-6 pb-16 pt-16 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div>
              <div className="eyebrow">
                Private Messaging For Trusted Circles
              </div>
              <h1 className="mt-6 max-w-4xl text-balance font-display text-6xl font-semibold tracking-tight text-[#fff1e8] sm:text-7xl lg:text-[5.4rem]">
                Private messaging for your trusted circle.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[#cdb1a5] sm:text-xl">
                Invite-only, private by design, and built so your conversations
                do not turn into a public profile or a searchable archive.
                Direct messages and new device-encrypted groups are live now,
                and the remaining compatibility paths are called out plainly.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/start" className="btn-primary px-6 py-3 text-base">
                  Start Here
                </Link>
                <Link
                  href="/register"
                  className="btn-ghost px-6 py-3 text-base"
                >
                  Request Access
                </Link>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                <Link
                  href="/download"
                  className="underline-offset-4 hover:underline"
                >
                  View launch targets
                </Link>
                <Link
                  href="/trust-and-safety"
                  className="underline-offset-4 hover:underline"
                >
                  Trust & safety
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {heroSignals.map((item) => (
                  <div key={item} className="info-chip">
                    <BadgeCheck
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-brand-400"
                    />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {liveTodayCards.map((stat) => (
                  <div
                    key={stat.title}
                    className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-center gap-2 text-brand-400">
                      <stat.icon aria-hidden="true" className="h-4 w-4" />
                      <span className="section-kicker">Live Today</span>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">
                      {stat.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {stat.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.02] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
              <ProductPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="section-spotlight relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute right-[-6%] top-[-8%] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,170,110,0.16),transparent_65%)] blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start">
            <div>
              <div className="section-kicker">Relay Boundary</div>
              <h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
                A relay that delivers without pretending to disappear.
              </h2>
              <p className="mt-4 section-copy">
                EmberChamber uses a hosted edge relay for metadata, mailbox
                delivery, and attachment storage. Private keys, DM history, and
                private-content search stay with the people in the circle.
              </p>

              <div className="mt-6 rounded-[1.7rem] border border-white/8 bg-white/[0.04] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                    <Cloud aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 text-[#b9968f]"
                  />
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                    <MonitorSmartphone aria-hidden="true" className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--text-secondary)] sm:grid-cols-3">
                  <div>Ciphertext envelopes move through the relay.</div>
                  <div>Private keys stay on the devices in the circle.</div>
                  <div>
                    Legacy hosted history still exists in a few compatibility
                    paths while migration finishes.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {trustFacts.map((fact) => (
                <div key={fact.title} className="card h-full p-5">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                    <LockKeyhole aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
                    {fact.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {fact.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="mb-8 max-w-2xl">
          <div className="section-kicker">First-Wave Surfaces</div>
          <h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Choose the surface that fits the session.
          </h2>
          <p className="mt-4 section-copy">
            Android, Windows, and Ubuntu are the first posted native clients.
            The browser covers onboarding, messaging, search, and settings when
            you need immediate access.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {launchPlatforms.map((platform) => (
            <div
              key={platform.name}
              className="card relative h-full overflow-hidden p-6"
            >
              <div
                className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${
                  launchAccent[platform.id as keyof typeof launchAccent]
                } opacity-90`}
              />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="section-kicker">{platform.artifact}</p>
                    <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                      {platform.name}
                    </h3>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                    <MonitorSmartphone aria-hidden="true" className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-brand-300">
                  {platform.status}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                  {platform.detail}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {launchSignals[platform.id as keyof typeof launchSignals].map(
                    (item) => (
                      <span key={item} className="metric-pill">
                        {item}
                      </span>
                    ),
                  )}
                </div>

                <div className="mt-auto pt-6">
                  <Link href="/download" className="btn-ghost">
                    See Posted Builds
                    <Download aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <div className="section-spotlight rounded-[2.2rem] px-6 py-8 sm:px-8">
            <div className="eyebrow">Beta Scope</div>
            <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              The beta is intentionally narrow, and that is part of the value.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Keep the surface tight, keep the trust story honest, and expand
              only where the runtime is already credible.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {betaScopeItems.map((item) => (
                <div
                  key={item.feature}
                  className="rounded-[1.4rem] border border-white/8 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.status === "live"
                          ? "bg-green-400 shadow-[0_0_14px_rgba(74,222,128,0.5)]"
                          : "bg-[#5a4037]"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        item.status === "live"
                          ? "text-green-300"
                          : "text-[#c7a89a]"
                      }`}
                    >
                      {item.status === "live" ? "Live" : "Planned"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                    {item.feature}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link href="/trust-and-safety" className="btn-ghost">
                Read The Trust Model
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <StartHereSummary />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="max-w-xl">
            <div className="section-kicker">FAQ</div>
            <h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              Honest answers before the beta opens wider.
            </h2>
            <p className="mt-4 section-copy">
              The strongest advantage on this site is still honesty. Keep that,
              then make the rest of the experience feel deliberate enough to
              deserve it.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <div key={item.question} className="card p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {item.question}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
