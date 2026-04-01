"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function InviteLandingPage() {
  const params = useParams<{ code: string }>();
  const inviteCode = params?.code ?? "";

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
            EmberChamber Invite
          </p>
          <h1 className="text-4xl font-bold text-[var(--text-primary)]">
            Open this invite in the native beta app
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-secondary)]">
            Group invites are handled by the Android and desktop beta clients. The web companion
            previews the code and explains the trust boundary, but it is no longer the primary
            messaging runtime.
          </p>
        </div>

        <div className="card space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
              Invite token
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)] break-all">
              {inviteCode || "Missing invite code"}
            </h2>
          </div>

          <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
            <p>
              Use this invite on: <span className="text-[var(--text-primary)]">Android, Windows, Ubuntu</span>
            </p>
            <p>
              Group size limit: <span className="text-[var(--text-primary)]">12 members</span>
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <p className="text-sm font-medium text-[var(--text-primary)]">Trust boundary</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Invites bootstrap membership into encrypted private groups. The hosted relay helps
              with delivery and offline sync, but it is not the place where decrypted group history
              lives.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/register" className="btn-primary block w-full py-3 text-center">
              Request beta access
            </Link>
            <Link href="/login" className="btn-ghost block w-full py-3 text-center">
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
