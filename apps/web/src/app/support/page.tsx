import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { githubIssuesUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: "How to get help with EmberChamber beta access, broken routes, and app issues.",
};

const supportTracks = [
  {
    title: "Broken link or error page",
    body: "Open a support issue with the URL, what you expected to happen, and the approximate time you hit the failure.",
  },
  {
    title: "Invite or bootstrap problem",
    body: "Include the invite code you used, the device label you entered, and whether the failure happened before or after the magic link email step.",
  },
  {
    title: "In-app bug",
    body: "Share the route, the last action you took, and a screenshot if the UI rendered an empty or partial state.",
  },
];

export default function SupportPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <div className="panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="eyebrow">Support</div>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            When something breaks, make the report actionable.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">
            EmberChamber is still beta software. The fastest way to get a route, invite, or web
            flow fixed is to report the exact surface that failed and the state you were in when it
            happened.
          </p>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {supportTracks.map((track) => (
              <div key={track.title} className="card h-full">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{track.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{track.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="card">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Before you file an issue</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                <li>Copy the full page URL.</li>
                <li>Note the UTC time the failure happened.</li>
                <li>Capture any support code or error digest shown on screen.</li>
                <li>Say whether the problem reproduces after a refresh.</li>
              </ul>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">If access is invite-based</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Ask the person or team that issued the invite to confirm the link is still valid and
                has remaining uses. The public web flow can only tell you so much when the invite is
                already expired or revoked upstream.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <a href={githubIssuesUrl} target="_blank" rel="noreferrer" className="btn-primary">
              Open a GitHub Issue
            </a>
            <Link href="/download" className="btn-ghost">
              Check Launch Targets
            </Link>
            <Link href="/trust-and-safety" className="btn-ghost">
              Read Trust & Safety
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
