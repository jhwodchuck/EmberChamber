import React from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { createMetadata } from "@/lib/metadata";
import { githubReleasesUrl } from "@/lib/site";
import { formatUtcDate } from "@/lib/format";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export const metadata = createMetadata({
  title: "Changelog",
  description:
    "Review EmberChamber release notes, platform updates, and active beta progress.",
  path: "/changelog",
});

interface GitHubReleaseItem {
  html_url: string;
  name: string | null;
  tag_name: string;
  prerelease: boolean;
  published_at: string | null;
  body: string | null;
}

async function getReleases(): Promise<GitHubReleaseItem[]> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/jhwodchuck/EmberChamber/releases",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "emberchamber-web-changelog",
        },
        next: {
          revalidate: 3600, // cache for 1 hour
        },
      }
    );
    if (!res.ok) {
      return [];
    }
    return (await res.json()) as GitHubReleaseItem[];
  } catch {
    return [];
  }
}

// Fallback changelog entries if API fails or is rate-limited
const staticChanges = [
  {
    version: "v0.1.0-beta.25",
    date: "2026-06-12",
    details: [
      "Integrated SQLite local state on Android and Tauri desktop surfaces",
      "Added invite-only onboarding email verification flow",
      "Implemented device-encrypted group history routing for new groups",
      "Established self-attested 18+ age verification gate during onboarding",
      "Fixed alternate canonical meta declarations on all marketing routes",
    ],
  },
  {
    version: "v0.1.0-beta.24",
    date: "2026-05-28",
    details: [
      "Rolled out browser companion DM secure mailbox envelope routing",
      "Added support ticket submission forms",
      "Initial implementation of the minimal relay edge worker contracts",
    ],
  },
];

export default async function ChangelogPage() {
  const apiReleases = await getReleases();

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
        <div className="cinema-panel relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10 mb-12">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,rgba(255,170,110,0.16),transparent_62%)]"
            aria-hidden="true"
          />
          <h1 className="text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            Changelog & Updates
          </h1>
          <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
            EmberChamber is an active beta project. We release features, bug
            fixes, and security updates frequently across our Android, Windows,
            Ubuntu, and Web companion surfaces.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={githubReleasesUrl}
              className="btn-primary inline-flex items-center gap-2"
            >
              <span>View GitHub Releases</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link href="/download" className="btn-ghost">
              Download Latest Builds
            </Link>
          </div>
        </div>

        <div className="space-y-12">
          {/* Note on Versioning */}
          <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.02] p-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Note on Beta Version Alignment
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              EmberChamber code packages align under version `v0.1.0-beta.25`.
              Individual platform binaries (like the Android APK or Windows MSI)
              are generated on independent pipelines when builds are verified.
              If you notice different tag references on platform files, this is
              by design to ensure you only run stable, verified binaries.
            </p>
          </div>

          <h2 className="text-2xl font-semibold text-[var(--text-primary)] border-b border-white/10 pb-4">
            Recent Release Notes
          </h2>

          {apiReleases.length > 0 ? (
            <div className="space-y-10">
              {apiReleases.map((release) => (
                <div
                  key={release.tag_name}
                  className="relative pl-8 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-brand-500"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      {release.name || release.tag_name}
                    </h3>
                    {release.published_at && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatUtcDate(release.published_at)} UTC
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-sm text-[var(--text-secondary)] leading-7 whitespace-pre-wrap max-w-none">
                    {release.body || "No release description provided."}
                  </div>
                  <a
                    href={release.html_url}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200 transition-colors"
                  >
                    View on GitHub <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              {staticChanges.map((change) => (
                <div
                  key={change.version}
                  className="relative pl-8 before:absolute before:left-0 before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-brand-500"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">
                      {change.version}
                    </h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {change.date}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {change.details.map((detail, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)] leading-6"
                      >
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-brand-400 flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
