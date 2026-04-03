import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Box, Download, MonitorSmartphone } from "lucide-react";
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

  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="section-spotlight relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10">
            <div
              className="pointer-events-none absolute right-0 top-0 h-72 w-72 bg-[radial-gradient(circle,rgba(255,170,110,0.16),transparent_62%)]"
              aria-hidden="true"
            />
            <div className="relative max-w-3xl">
              <div className="eyebrow">Launch Targets</div>
              <h1 className="mt-5 text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
                Android, Windows, and Ubuntu are the first wave. Web stays available.
              </h1>
              <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
                The first committed native surfaces are Android, Windows, and Ubuntu. The browser
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
            </div>
          </div>

          <div className="panel px-6 py-7">
            <p className="section-kicker">Current Release State</p>
            {latestRelease ? (
              <>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
                  {latestRelease.releaseName}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {latestRelease.prerelease ? "Latest prerelease" : "Latest release"}
                  {latestRelease.publishedAt ? ` published ${formatUtcDate(latestRelease.publishedAt)} UTC.` : "."}
                </p>
                <a
                  href={latestRelease.releaseUrl}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-300 transition-colors hover:text-brand-200"
                >
                  Open release page
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

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {launchPlatforms.map((platform) => (
            <div key={platform.name} className="card relative h-full overflow-hidden p-6">
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

                <div className="mt-6 space-y-3">
                  {latestRelease?.downloadsByPlatform[platform.id]?.length ? (
                    <>
                      {latestRelease.downloadsByPlatform[platform.id].map((download) => (
                        <a
                          key={download.url}
                          href={download.url}
                          className="btn-primary inline-flex w-full items-center justify-center"
                        >
                          Download {download.label}
                        </a>
                      ))}
                      <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                        {latestRelease.downloadsByPlatform[platform.id].map((download) => (
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
                        attached to the latest release.
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
              All surfaces share the same relay contracts and encryption model. The real differences
              are device integration, push behavior, and which client should be your default home.
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

          <div className="panel px-6 py-7">
            <p className="section-kicker">Beyond First Wave</p>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              iPhone and macOS remain later-surface work.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              They still exist in the repo, but the first-wave release discipline is focused on
              Android, Windows, Ubuntu, and the browser companion.
            </p>
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
      </section>
    </MarketingShell>
  );
}
