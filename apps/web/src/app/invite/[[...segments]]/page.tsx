"use client";

import { useParams, useRouter } from "next/navigation";
import { InviteExplorer } from "@/components/invite-explorer";
import { MarketingShell } from "@/components/marketing-shell";
import { acceptedInviteHref } from "@/lib/conversation-routes";

export default function InviteLandingPage() {
  const params = useParams<{ segments?: string[] }>();
  const router = useRouter();
  const segments = Array.isArray(params?.segments) ? params.segments : [];
  const [conversationId = "", inviteToken = "", ...restSegments] = segments;
  const legacyInviteCode = segments.length === 1 ? conversationId : "";

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
            EmberChamber Invite
          </p>
          <h1 className="text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            {segments.length >= 2
              ? "Preview the private space before you trust the link."
              : "Preview the invite before you trust it."}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            {segments.length >= 2
              ? "Check who issued the invite, how long it lasts, and what boundary rules apply before you accept it into your account."
              : "New relay-native invites now include both a conversation id and a token. This fallback route stays available so older links can still land on a safe preview surface."}
          </p>
        </div>

        <InviteExplorer
          initialConversationId={segments.length >= 2 ? conversationId : ""}
          initialToken={segments.length >= 2 ? inviteToken : ""}
          mode="public"
          onAccept={(result) => {
            router.push(acceptedInviteHref(result));
          }}
        />

        {legacyInviteCode ? (
          <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
            Legacy invite fragment detected:{" "}
            <span className="font-mono">{legacyInviteCode}</span>
          </p>
        ) : null}

        {restSegments.length > 0 ? (
          <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
            Extra invite path segments were ignored so the preview can stay on
            the safe browser surface.
          </p>
        ) : null}
      </section>
    </MarketingShell>
  );
}
