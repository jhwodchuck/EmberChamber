"use client";

import { useParams, useRouter } from "next/navigation";
import { InviteExplorer } from "@/components/invite-explorer";
import { MarketingShell } from "@/components/marketing-shell";
import { acceptedInviteHref } from "@/lib/conversation-routes";

export default function InviteLandingPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const inviteCode = params?.code ?? "";

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
            EmberChamber Invite
          </p>
          <h1 className="text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Preview the invite before you trust it.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            New relay-native invites now include both a conversation id and a token. This fallback route
            stays available so older links can still land on a safe preview surface.
          </p>
        </div>

        <InviteExplorer
          mode="public"
          onAccept={(result) => {
            router.push(acceptedInviteHref(result));
          }}
        />

        {inviteCode ? (
          <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
            Legacy invite fragment detected: <span className="font-mono">{inviteCode}</span>
          </p>
        ) : null}
      </section>
    </MarketingShell>
  );
}
