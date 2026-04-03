import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDate } from "@/lib/format";
import { getLatestPlatformRelease } from "@/lib/releases";
import { githubReleasesUrl, githubSourceZipUrl, launchPlatforms, surfaceCapabilities } from "@/lib/site";

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
        <div className="max-w-3xl">
          <div className="eyebrow">Launch targets</div>
          <h1 className="mt-5 font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            Android, Windows, and Ubuntu are the first wave. Web stays available.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            The first committed native surfaces are Android, Windows, and Ubuntu. The web app
            stays available for onboarding, messaging, recovery, and other lighter-weight use when
            you need access immediately.
          </p>
        </div>

        <div className="mt-8 max-w-3xl">
          <StatusCallout tone="info" title="Use this page to check which first-wave builds are posted">
            If a native build is not posted here yet, the web app still handles onboarding,
            messaging, invite review, and account flows. This page shows when a first-wave native
            client is actually downloadable.
          </StatusCallout>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {launchPlatforms.map((platform) => (
            <div key={platform.name} className="card h-full">
              <div className="text-xs uppercase tracking-[0.2em] text-brand-600">{platform.artifact}</div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{platform.name}</h2>
              <p className="mt-2 text-sm font-medium text-brand-700">{platform.status}</p>
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{platform.detail}</p>

              <div className="mt-6">
                {latestRelease?.downloadsByPlatform[platform.id]?.length ? (
                  <div className="space-y-3">
                    {latestRelease.downloadsByPlatform[platform.id].map((download) => (
                      <a
                        key={download.url}
                        href={download.url}
                        className="btn-primary inline-flex w-full items-center justify-center"
                      >
                        Download {download.label}
                      </a>
                    ))}
                    <p className="text-xs leading-5 text-[var(--text-secondary)]">
                      {latestRelease.prerelease ? "Latest prerelease" : "Latest release"}{" "}
                      <span className="font-medium text-[var(--text-primary)]">
                        {latestRelease.releaseName}
                      </span>
                      {latestRelease.publishedAt
                        ? ` published ${formatUtcDate(latestRelease.publishedAt)} UTC`
                        : ""}
                      .
                    </p>
                    <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                      {latestRelease.downloadsByPlatform[platform.id].map((download) => (
                        <li key={`${download.url}-meta`}>
                          {download.label} • {formatBytes(download.size)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-sm font-medium text-[var(--text-primary)]">No public build posted yet</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      This platform is part of the beta plan, but there is no downloadable public
                      binary published for it yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="panel px-6 py-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Current release state</h2>
            {latestRelease ? (
              <>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  The download buttons above come from the latest GitHub release with platform
                  assets attached.
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Active release:{" "}
                  <a
                    href={latestRelease.releaseUrl}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {latestRelease.releaseName}
                  </a>
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  No public GitHub release with downloadable binaries exists yet. The site now
                  reflects that instead of pretending builds are already posted.
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Until the first beta release is published, the only immediate download available
                  is the source tree.
                </p>
              </>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={githubReleasesUrl} className="btn-primary">
                View GitHub releases
              </a>
              <a href={githubSourceZipUrl} className="btn-ghost">
                Download source zip
              </a>
            </div>
          </div>

          <div className="panel px-6 py-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">What comes after beta</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              iPhone and macOS have build scaffolds in the repo, but they remain later-surface work
              until Android, Windows, Ubuntu, and web are stable enough to justify the extra
              reliability and review work.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Tagged GitHub releases are the source of truth for when public binaries actually
              exist.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-[var(--text-primary)]">What each surface can do</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            All surfaces share the same relay contracts and E2EE. The differences are push notifications,
            native device integration, and which one you should start with.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {surfaceCapabilities.map((surface) => (
              <div key={surface.name} className="panel px-5 py-6">
                <div className="text-xs uppercase tracking-[0.2em] text-brand-600">{surface.badge}</div>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{surface.name}</h3>
                <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">{surface.recommended}</p>
                <ul className="mt-4 space-y-2">
                  {surface.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-0.5 flex-shrink-0 text-green-500">✓</span>
                      {cap}
                    </li>
                  ))}
                  {surface.caveat ? (
                    <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-0.5 flex-shrink-0 text-[var(--border)]">–</span>
                      {surface.caveat}
                    </li>
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/trust-and-safety" className="btn-primary">
            Read the trust model
          </Link>
          <a href={githubReleasesUrl} className="btn-ghost">
            GitHub releases
          </a>
          <Link href="/" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
