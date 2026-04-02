"use client";

import Link from "next/link";

export default function NewChannelPage() {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col p-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
        Closed beta communities
      </p>
      <h2 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
        Community rooms live under the new community flow
      </h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Phase 2 adds invite-gated communities and rooms, but they are managed from the community
        control surface instead of the old channel placeholder route.
      </p>
      <div className="space-y-4">
        <div className="card">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Create the community first</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Start with a community, then create rooms inside it with all-member or restricted
            access. Invite policy and room scope stay organizer-controlled by default.
          </p>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Keep discovery closed</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Search and invites remain scoped to spaces the account already joined. Nothing here
            reintroduces public browsing or a global member directory.
          </p>
        </div>
        <Link href="/app/new-community" className="btn-primary w-fit">
          Open Community Builder
        </Link>
      </div>
    </div>
  );
}
