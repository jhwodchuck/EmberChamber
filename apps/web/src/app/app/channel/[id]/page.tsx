"use client";

import Link from "next/link";

export default function ChannelPage() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
        Relay-first migration
      </p>
      <h2 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Legacy browser channels are retired from the active beta surface
      </h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        The web app now centers on relay-native direct messages, small groups,
        invite review, joined-space search, and settings. Channel-style legacy
        browser routes are no longer part of the active beta runtime.
      </p>
      <div className="space-y-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Use instead
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Start a DM, create a private group, or use joined-space search to
            reach the conversation you already share with someone.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/app/new-dm" className="btn-primary">
          Start a DM
        </Link>
        <Link href="/app/new-group" className="btn-ghost">
          Create a Group
        </Link>
      </div>
    </div>
  );
}
