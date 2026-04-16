import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";

const featuredShot = {
  src: "/screenshots/home/01-public-invite-preview.png",
  alt: "Invite preview screen in the EmberChamber web companion showing invite details before account handoff.",
  title: "Invite review before account handoff",
  body: "Check the space, issuer, and boundary before the link turns into a session.",
  width: 1280,
  height: 1470,
  pill: "Preview the space",
};

const supportingShots = [
  {
    src: "/screenshots/home/03-profile-created.png",
    alt: "Settings screen in the EmberChamber web companion showing profile setup during onboarding.",
    title: "Profile and recovery details stay visible",
    body: "The browser flow covers the quiet setup work without sending people into a public profile funnel.",
    width: 1280,
    height: 1042,
    pill: "Settings live",
  },
  {
    src: "/screenshots/home/04-first-message-sent.png",
    alt: "Direct message screen in the EmberChamber web companion after the first message has been sent.",
    title: "Direct messages are already usable",
    body: "Search, settings, invite review, and first-message handoff already fit in the same companion surface.",
    width: 1280,
    height: 1068,
    pill: "DM handoff live",
  },
] as const;

const proofSignals = [
  "Invite review before join",
  "Settings and recovery in-browser",
  "Messaging, search, and admin in one surface",
];

export function HomeScreenshotProof() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <div className="section-spotlight relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
        <div
          className="ambient-orb left-[-4%] top-8 h-56 w-56 motion-safe:animate-[drift-soft_12s_ease-in-out_infinite]"
          aria-hidden="true"
        />
        <div
          className="ambient-orb right-[4%] top-0 h-48 w-48 motion-safe:animate-[drift-soft_10s_ease-in-out_infinite]"
          aria-hidden="true"
        />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start">
          <div className="max-w-xl">
            <div className="section-kicker">Current Web Companion</div>
            <h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              Real screens from the live beta flow.
            </h2>
            <p className="mt-4 section-copy">
              The homepage mockup stays in place, but the product no longer has
              to speak only through a concept render. These captures show the
              current invite review, profile setup, and first-message handoff
              in the browser companion.
            </p>

            <div className="mt-6 space-y-3">
              {proofSignals.map((signal) => (
                <div
                  key={signal}
                  className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"
                >
                  <BadgeCheck
                    aria-hidden="true"
                    className="h-4 w-4 flex-shrink-0 text-brand-400"
                  />
                  <span>{signal}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/start" className="btn-primary px-6 py-3 text-base">
                Start The Beta Flow
              </Link>
              <Link href="/download" className="btn-ghost px-6 py-3 text-base">
                See Posted Builds
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <figure className="group story-card overflow-hidden rounded-[2rem] p-3 xl:row-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3 px-2 pb-4 pt-2 sm:px-3">
                <div className="max-w-sm">
                  <div className="section-kicker">Join With Context</div>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                    {featuredShot.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {featuredShot.body}
                  </p>
                </div>
                <span className="metric-pill whitespace-nowrap">
                  {featuredShot.pill}
                </span>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
                <Image
                  src={featuredShot.src}
                  alt={featuredShot.alt}
                  width={featuredShot.width}
                  height={featuredShot.height}
                  sizes="(min-width: 1280px) 34rem, (min-width: 1024px) 48vw, 100vw"
                  className="h-auto w-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.015]"
                />
              </div>
            </figure>

            {supportingShots.map((shot) => (
              <figure
                key={shot.src}
                className="group story-card-muted overflow-hidden rounded-[1.8rem] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 px-2 pb-4 pt-2 sm:px-3">
                  <div className="max-w-sm">
                    <div className="section-kicker">Companion Workspace</div>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                      {shot.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {shot.body}
                    </p>
                  </div>
                  <span className="metric-pill whitespace-nowrap">
                    {shot.pill}
                  </span>
                </div>

                <div className="overflow-hidden rounded-[1.35rem] border border-white/10">
                  <Image
                    src={shot.src}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw"
                    className="h-auto w-full object-cover transition duration-500 motion-safe:group-hover:scale-[1.015]"
                  />
                </div>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
