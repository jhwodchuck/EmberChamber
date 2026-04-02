import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { getLatestPlatformRelease } from "@/lib/releases";
import { githubReleasesUrl, githubSourceZipUrl, launchPlatforms } from "@/lib/site";

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
            Android first. Desktop where it helps. Browser for support and bootstrap.
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            EmberChamber is not treating every surface as equal. The beta ships where the trust
            model and packaging path are defensible first, then expands from there.
          </p>
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
                        ? ` published ${new Date(latestRelease.publishedAt).toLocaleDateString()}`
                        : ""}
                      .
                    </p>
                    <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                      {latestRelease.downloadsByPlatform[platform.id].map((download) => (
                        <li key={`${download.url}-meta`}>
                          {download.label} • {formatBytes(download.size)} • {download.downloadCount} downloads
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
              iPhone and macOS stay out of the first beta until the Android and desktop paths are
              stable enough to justify the extra reliability and review work.
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Tagged GitHub releases are the source of truth for when public binaries actually
              exist.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="panel px-6 py-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">What the browser is for now</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              The web app is the public companion surface: positioning, invite landings, account
              recovery support, and bootstrap UI. It is not the primary launch chat runtime.
            </p>
          </div>
          <div className="panel px-6 py-7">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Why download availability is uneven</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              Android, Windows, and Ubuntu are the first packaging targets, but each one still
              depends on its own build lane, signing path, and artifact publishing step.
            </p>
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
