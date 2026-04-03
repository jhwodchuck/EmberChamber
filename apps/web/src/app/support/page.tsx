import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { githubIssuesUrl, supportEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with EmberChamber beta access, invites, and app issues.",
};

const supportTracks = [
  {
    title: "Invite or bootstrap problem",
    body: "Include your invite code, the device label you entered, and whether the failure happened before or after the magic-link email step.",
  },
  {
    title: "Can't sign in",
    body: "Email us your device label and the private email you used to register. We'll look up the account and get you back in.",
  },
  {
    title: "Broken page or in-app bug",
    body: "Share the full URL, the last action you took, and a screenshot if the page rendered empty or partially. Note the approximate UTC time.",
  },
];

export default function SupportPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <div className="panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="eyebrow">Support</div>
          <h1 className="mt-5 max-w-3xl text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
            Get help with your beta access.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-secondary)]">
            We&apos;re a small team building in the open. Email us directly — it&apos;s the fastest path for
            invite and access issues. Expect a reply within 1–2 business days.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href={`mailto:${supportEmail}`} className="btn-primary">
              Email Support
            </a>
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="select-all font-medium text-[var(--text-primary)]">{supportEmail}</span>
            </p>
          </div>

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
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">What to include</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                <li>The full URL where the failure happened.</li>
                <li>Approximate time (UTC if you know it).</li>
                <li>Any error code or digest shown on screen.</li>
                <li>Whether it reproduces after a page refresh.</li>
              </ul>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Invite codes that aren&apos;t working</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Codes can expire or run out of uses. Confirm with whoever sent yours that it&apos;s still
                valid, then email support with the code. We can look it up on our end.
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-[var(--border)] pt-8 flex flex-wrap gap-4 items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">
              Prefer to file a public bug report?{" "}
              <a
                href={githubIssuesUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-600 hover:underline"
              >
                Open a GitHub issue
              </a>{" "}
              for reproducible bugs and technical problems.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/download" className="btn-ghost">
                Check Downloads
              </Link>
              <Link href="/trust-and-safety" className="btn-ghost">
                Trust & Safety
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}


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
