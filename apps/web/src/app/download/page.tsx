import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Box,
  Cloud,
  Download,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { formatUtcDate } from "@/lib/format";
import { getLatestPlatformRelease } from "@/lib/releases";
import {
  githubReleasesUrl,
  githubSourceZipUrl,
  launchPlatforms,
  surfaceCapabilities,
} from "@/lib/site";
import { MarketingShell } from "@/components/marketing-shell";

export const metadata: Metadata = {
  title: "Launch Targets",
  description:
    "Current EmberChamber beta targets, packaging paths, and what the browser is still responsible for.",
};

function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

const platformAccent = {
  android: "from-brand-500/18 via-brand-500/5 to-transparent",
  windows: "from-sky-300/14 via-sky-200/4 to-transparent",
  ubuntu: "from-amber-300/14 via-amber-200/4 to-transparent",
} as const;

const platformProfiles = {
  android: {
    bestFor: "Pocket-first daily use",
    moments: ["Native mobile integration", "Primary mobile client", "Best for staying in the circle all day"],
  },
  windows: {
    bestFor: "Longer sessions and desk-first use",
    moments: ["Native desktop shell", "Room for longer threads", "Strong default for desktop-heavy testers"],
  },
  ubuntu: {
    bestFor: "Linux operators and native desktop fans",
    moments: ["AppImage and .deb packaging", "Same runtime capability as desktop", "Useful when Linux is your primary environment"],
  },
} as const;

const recommendedToday = [
  {
    title: "Need the fastest start",
    body: "Use the browser first. It covers onboarding, invite review, settings, and lighter chat without waiting for a native install.",
    href: "/start",
    label: "Start On Web",
  },
  {
    title: "Need a daily mobile home",
    body: "Choose Android when a posted build exists. It remains the first-wave native client for day-to-day use.",
    href: "#android",
    label: "Check Android",
  },
  {
    title: "Need a desk-first surface",
    body: "Choose Windows or Ubuntu when a posted build exists. If neither is posted, treat web as the fallback instead of guessing.",
    href: githubReleasesUrl,
    label: "Open Release Feed",
  },
] as const;

export default function DownloadPage() {
  const latestReleasePromise = getLatestPlatformRelease();

  return <DownloadPageInner latestReleasePromise={latestReleasePromise} />;
}

async function DownloadPageInner({
  latestReleasePromise,
}: {
  latestReleasePromise: ReturnType<typeof getLatestPlatformRelease>;
}) {
  const latestRelease = await latestReleasePromise;
  const platformBuilds = launchPlatforms.map((platform) => ({
    platform,
    build: latestRelease?.buildsByPlatform[platform.id] ?? null,
  }));
  const totalPostedAssets = platformBuilds.reduce(
    (count, entry) => count + (entry.build?.downloads.length ?? 0),
    0
  );
  const surfacesWithBuilds = platformBuilds.filter((entry) => entry.build).length;
  const representedTags = new Set(
    platformBuilds.flatMap((entry) => (entry.build ? [entry.build.releaseTag] : []))
  ).size;

  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-stretch">
          <div className="cinema-panel relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
            <div
              className="pointer-events-none absolute right-0 top-0 h-72 w-72 bg-[radial-gradient(circle,rgba(255,170,110,0.16),transparent_62%)]"
              aria-hidden="true"
            />
            <div className="pointer-events-none absolute inset-0 glow-grid opacity-35" aria-hidden="true" />
            <div className="relative max-w-3xl">
              <div className="eyebrow">Launch Targets</div>
              <h1 className="mt-5 text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
                Pick the surface you want to live in, then verify the posted build.
              </h1>
              <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
                Android, Windows, and Ubuntu are the first committed native surfaces. The browser
                still matters for onboarding, lighter sessions, settings, and immediate access when
                no posted native build exists yet.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a href={githubReleasesUrl} className="btn-primary">
                  View GitHub Releases
                </a>
                <a href={githubSourceZipUrl} className="btn-ghost">
                  Download Source Zip
                </a>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {["Android first-wave priority", "Desktop clients posted from release feed", "Web remains the fallback surface"].map((item) => (
                  <span key={item} className="metric-pill">
                    <BadgeCheck className="h-3.5 w-3.5 text-brand-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="panel px-6 py-7">
            <p className="section-kicker">Posted Build Feed</p>
            {latestRelease ? (
              <>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
                  {surfacesWithBuilds}/3 native surfaces have a posted build
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  GitHub Releases is the source of truth. Each platform card below shows the latest
                  release tag that actually contains that platform&apos;s posted artifacts.
                </p>

                <div className="mt-6 grid gap-3">
                  {[
                    { label: "Posted assets", value: String(totalPostedAssets) },
                    { label: "Native surfaces live", value: `${surfacesWithBuilds}/3` },
                    { label: "Release tags represented", value: String(representedTags) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/8 bg-white/[0.04] px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a98982]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <a
                  href={githubReleasesUrl}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-300 transition-colors hover:text-brand-200"
                >
                  Open release feed
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </a>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
                  No public release posted yet
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  This page reflects posted binaries only. If nothing is attached to a release yet,
                  use the browser or build from source.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-10 mb-8 max-w-2xl">
          <div className="section-kicker">Recommended Today</div>
          <h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Start with the surface that matches the moment, not the slogan.
          </h2>
          <p className="mt-4 section-copy">
            Posted builds can land on different tags. The right choice is whichever surface is
            actually available and best suited to the session you are starting.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {recommendedToday.map((item) =>
            item.href.startsWith("/") ? (
              <Link key={item.title} href={item.href} className="rounded-[1.45rem] border border-white/8 bg-white/[0.04] p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-500/25">
                <p className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                <span className="mt-4 inline-flex text-sm font-medium text-brand-300">{item.label}</span>
              </Link>
            ) : (
              <a
                key={item.title}
                href={item.href}
                className="rounded-[1.45rem] border border-white/8 bg-white/[0.04] p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-500/25"
              >
                <p className="text-lg font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                <span className="mt-4 inline-flex text-sm font-medium text-brand-300">{item.label}</span>
              </a>
            ),
          )}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {platformBuilds.map(({ platform, build }) => (
            <div key={platform.name} id={platform.id} className="card relative h-full overflow-hidden p-6">
              <div
                className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${
                  platformAccent[platform.id as keyof typeof platformAccent]
                } opacity-90`}
              />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="section-kicker">{platform.artifact}</p>
                    <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{platform.name}</h2>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                    <MonitorSmartphone aria-hidden="true" className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-3 text-sm font-medium text-brand-300">{platform.status}</p>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{platform.detail}</p>

                {build ? (
                  <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-white/[0.04] px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a98982]">
                      Latest posted build
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      {build.releaseTag}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {build.prerelease ? "Prerelease" : "Release"}
                      {build.publishedAt ? ` published ${formatUtcDate(build.publishedAt)} UTC.` : "."}
                    </p>
                    <a
                      href={build.releaseUrl}
                      className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-brand-300 transition-colors hover:text-brand-200"
                    >
                      Open tagged release
                      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}

                <div className="mt-5 showcase-screen rounded-[1.45rem] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd0b6]">
                    Best for
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#fff1e8]">
                    {platformProfiles[platform.id as keyof typeof platformProfiles].bestFor}
                  </p>
                  <div className="mt-4 space-y-2">
                    {platformProfiles[platform.id as keyof typeof platformProfiles].moments.map((item) => (
                      <div key={item} className="signal-line py-2.5 text-xs leading-5">
                        <span className="signal-dot mt-1.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {build ? (
                    <>
                      {build.downloads.map((download) => (
                        <a
                          key={download.url}
                          href={download.url}
                          className="btn-primary inline-flex w-full items-center justify-center"
                        >
                          Download {download.label}
                        </a>
                      ))}
                      <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                        {build.downloads.map((download) => (
                          <li key={`${download.url}-meta`}>
                            {download.label} • {formatBytes(download.size)}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="rounded-[1.3rem] border border-dashed border-white/12 bg-white/[0.03] p-4">
                      <p className="text-sm font-medium text-[var(--text-primary)]">No public build posted yet</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        This surface is part of the beta plan, but no downloadable public binary is
                        attached to the release feed yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
          <div className="section-spotlight rounded-[2.2rem] px-6 py-8 sm:px-8">
            <div className="section-kicker">Surface Capabilities</div>
            <h2 className="mt-4 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              What each surface can actually do.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              All surfaces share the same relay contracts and local-first direction, but not the
              same current encryption maturity. Browser DMs and new groups are ahead of legacy
              compatibility history and native attachment encryption, so read these cards as
              current-state guidance rather than parity claims.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {surfaceCapabilities.map((surface) => (
                <div key={surface.name} className="rounded-[1.45rem] border border-white/8 bg-white/[0.04] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker">{surface.badge}</p>
                      <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{surface.name}</h3>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-brand-400">
                      <Box aria-hidden="true" className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-brand-300">
                    {surface.recommended}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {surface.capabilities.map((capability) => (
                      <li key={capability} className="flex items-start gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                        <BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                        <span>{capability}</span>
                      </li>
                    ))}
                    {surface.caveat ? (
                      <li className="text-sm leading-6 text-[var(--text-secondary)]">{surface.caveat}</li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="cinema-panel relative overflow-hidden rounded-[2rem] px-6 py-7">
            <div
              className="pointer-events-none absolute right-[-8%] top-[-12%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(255,163,104,0.16),transparent_65%)] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative">
              <p className="section-kicker">Beyond First Wave</p>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
                iPhone and macOS remain later-surface work.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                They still exist in the repo, but the first-wave release discipline is focused on
                Android, Windows, Ubuntu, and the browser companion.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    icon: Cloud,
                    title: "Shared relay boundary",
                    body: "Every client uses the same hosted-delivery model, but current history and attachment handling still differ by path.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Shared local-first direction",
                    body: "Keys, search, and DM history stay device-centered, even though legacy group history and native attachment encryption are still being migrated.",
                  },
                  {
                    icon: Download,
                    title: "Release feed stays authoritative",
                    body: "If a platform build is not posted there, assume web is still the right surface for now.",
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-brand-400">
                      <item.icon aria-hidden="true" className="h-4 w-4" />
                      <span className="section-kicker">{item.title}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/trust-and-safety" className="btn-ghost">
                  Read The Trust Model
                </Link>
                <a href={githubReleasesUrl} className="btn-ghost">
                  Release Feed
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
