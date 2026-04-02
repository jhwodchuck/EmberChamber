"use client";

import { useParams, useRouter } from "next/navigation";
import { InviteExplorer } from "@/components/invite-explorer";
import { MarketingShell } from "@/components/marketing-shell";
import { acceptedInviteHref } from "@/lib/conversation-routes";

export default function GroupInviteLandingPage() {
  const params = useParams<{ groupId: string; token: string }>();
  const router = useRouter();
  const groupId = params?.groupId ?? "";
  const token = params?.token ?? "";

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
            EmberChamber Invite
          </p>
          <h1 className="text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Preview the private space before you trust the link.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Check who issued the invite, how long it lasts, and what boundary rules apply before
            you accept it into your account.
          </p>
        </div>

        <InviteExplorer
          initialConversationId={groupId}
          initialToken={token}
          mode="public"
          onAccept={(result) => {
            router.push(acceptedInviteHref(result));
          }}
        />
      </section>
    </MarketingShell>
  );
}
