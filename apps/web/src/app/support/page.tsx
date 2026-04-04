import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { PrivacyBoundaryMatrix } from "@/components/privacy-boundary-matrix";
import { MarketingShell } from "@/components/marketing-shell";
import { githubIssuesUrl, privacyBoundaryItems, supportEmail } from "@/lib/site";

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

const supportDecisionTree = [
  {
    title: "Need to join",
    body: "Use this if you have a beta invite or need help figuring out whether the invite path is still valid.",
    href: "/register",
    label: "Join Beta",
  },
  {
    title: "Need to recover access",
    body: "Use this if the account already exists and the email or redirect flow is not landing you where it should.",
    href: "/login",
    label: "Request Sign-In Link",
  },
  {
    title: "Need a build or product answer",
    body: "Use this if the question is really about which client to use, posted builds, or current beta scope.",
    href: "/download",
    label: "Check Builds",
  },
] as const;

const bugReportTemplate = [
  "URL:",
  "Approximate UTC time:",
  "What happened:",
  "What you expected:",
  "Error code or digest:",
  "Screenshot attached: yes/no",
].join("\n");

const quickAnswers = [
  {
    question: "Can't access my invite code.",
    answer:
      "Invite codes expire and have limited uses. Ask whoever sent yours to confirm it's still active, then email us the code and we'll look it up.",
  },
  {
    question: "Didn't get the magic-link email.",
    answer:
      "Check your spam folder first. If it's not there within a few minutes, email support with the address you used and we'll resend manually.",
  },
  {
    question: "Which client should I start with?",
    answer:
      "Start with the web app — no install needed, works immediately after onboarding. Move to Android or desktop when you want the preferred daily experience.",
  },
  {
    question: "What data stays on my device?",
    answer:
      "Your private keys, DM history, and private-content search index stay on your device. The relay still stores account, invite, session, and attachment data needed for the hosted beta, so use the privacy page for the exact boundary.",
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

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {supportDecisionTree.map((item) => (
              <div key={item.title} className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.body}</p>
                <div className="mt-4">
                  <Link href={item.href} className="btn-ghost">
                    {item.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {quickAnswers.map((qa) => (
              <div key={qa.question} className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{qa.question}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{qa.answer}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-[var(--border)] pt-8">
            <p className="text-base font-semibold text-[var(--text-primary)]">Still need help?</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Email us directly — it&apos;s the fastest path. Expect a reply within 1–2 business days.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a href={`mailto:${supportEmail}`} className="btn-primary">
              Email Support
            </a>
            <CopyButton value={supportEmail} label="Copy Support Email" successMessage="Support email copied" />
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
              <div className="mt-4">
                <CopyButton value={bugReportTemplate} label="Copy Bug Template" successMessage="Bug template copied" />
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Invite codes that aren&apos;t working</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                Codes can expire or run out of uses. Confirm with whoever sent yours that it&apos;s still
                valid, then email support with the code. We can look it up on our end.
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-[var(--border)] pt-8">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Privacy boundary today</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              The simplest accurate answer is that DMs and private-content search stay local-first,
              while the hosted beta still needs metadata, attachment storage, and a few legacy
              compatibility paths.
            </p>
            <div className="mt-5">
              <PrivacyBoundaryMatrix items={privacyBoundaryItems.slice(0, 4)} />
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
