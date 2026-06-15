import React from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { createMetadata } from "@/lib/metadata";
import { supportEmail, githubRepoUrl } from "@/lib/site";
import { ShieldCheck, Mail, AlertTriangle } from "lucide-react";

export const metadata = createMetadata({
  title: "Security Policy",
  description:
    "Report security issues in EmberChamber and review the beta security scope, trust model, and responsible disclosure path.",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
        <div className="cinema-panel relative overflow-hidden rounded-[2.4rem] px-6 py-8 sm:px-8 sm:py-10 mb-12">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-80 bg-[radial-gradient(circle_at_center,rgba(255,170,110,0.16),transparent_62%)]"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="flex items-center gap-2 eyebrow mb-3">
              <ShieldCheck className="h-4 w-4 text-brand-400" />
              <span>Security</span>
            </div>
            <h1 className="text-balance font-display text-5xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-6xl">
              Security & Responsible Disclosure
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
              EmberChamber is currently in a public beta. We take the security
              of our messaging state and local caches seriously, and welcome
              audits and feedback from researchers.
            </p>
          </div>
        </div>

        <div className="space-y-8 text-[var(--text-secondary)] leading-7">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Reporting a Vulnerability
            </h2>
            <p>
              If you discover a security issue, please disclose it to us
              responsibly. Do not publish vulnerability details publicly until we
              have had a reasonable timeframe to review and address the issue.
            </p>
            <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-5 flex items-start gap-4">
              <Mail className="h-5 w-5 text-brand-400 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">
                  Security Contact Email
                </p>
                <p className="mt-1 font-mono text-sm text-brand-300">
                  <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              What to Include in Your Report
            </h2>
            <p>
              To help us understand and resolve the issue quickly, please
              include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                A clear description of the vulnerability and its potential
                impact.
              </li>
              <li>
                Detailed step-by-step instructions (or a proof-of-concept
                script) to reproduce the behavior.
              </li>
              <li>
                The specific platform (Web companion, Android client, Windows,
                or Ubuntu desktop shell) and version affected.
              </li>
              <li>
                Your contact information and public PGP key if you wish to
                encrypt further communication.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              In-Scope Areas
            </h2>
            <p>We are especially interested in reports addressing:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Client-side cryptographic failures in message decryption or
                group epoch state transitions.
              </li>
              <li>
                Unauthorized access to other users&apos; mailbox ciphertext
                envelopes on the hosted relay.
              </li>
              <li>
                Remote code execution or sandbox escapes in Tauri desktop shells
                or Android APKs.
              </li>
              <li>Local cache database decryption bypasses.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
              Out-of-Scope and Prohibited Activities
            </h2>
            <div className="rounded-[1.45rem] border border-yellow-500/20 bg-yellow-500/[0.02] p-5 flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold text-[var(--text-primary)]">
                  Responsible Testing Ground Rules
                </p>
                <p className="text-sm">
                  Please do not attack real users or disrupt service. The
                  following actions are strictly out of scope and constitute
                  violations of our terms:
                </p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  <li>Denial of Service (DoS/DDoS) attacks against the relay.</li>
                  <li>
                    Spamming or sending unsolicited invitations to test
                    endpoints.
                  </li>
                  <li>
                    Social engineering or phishing of EmberChamber users or
                    developers.
                  </li>
                  <li>
                    Accessing or modifying data belonging to other active
                    accounts without authorization.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/10 pt-6">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              Beta Status Notice
            </h2>
            <p>
              Because this is an active beta project, features and protocols are
              updated frequently. We do not currently operate a financial bug
              bounty program, but we will attribute credit to contributing
              security researchers in our{" "}
              <Link href="/changelog" className="underline hover:text-brand-300">
                Changelog
              </Link>{" "}
              and repository commit history.
            </p>
            <p>
              For more information on our encryption boundaries, please see our{" "}
              <Link
                href="/trust-and-safety"
                className="underline hover:text-brand-300"
              >
                Trust & Safety Model
              </Link>{" "}
              and the{" "}
              <a
                href={`${githubRepoUrl}/blob/main/SECURITY.md`}
                className="underline hover:text-brand-300"
              >
                Official GitHub Security Policy
              </a>
              .
            </p>
          </section>
        </div>
      </section>
    </MarketingShell>
  );
}
