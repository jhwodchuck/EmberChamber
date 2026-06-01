"use client";

import { BadgeCheck, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { InviteExplorer } from "@/components/invite-explorer";
import { acceptedInviteHref } from "@/lib/conversation-routes";

export default function DiscoverPage() {
  const router = useRouter();
  const reviewSteps = [
    ["Paste", "Drop in the invite link exactly as received.", KeyRound],
    ["Preview", "Check issuer, space, scope, and limits first.", ShieldCheck],
    ["Join", "Accept only after the boundary looks right.", BadgeCheck],
  ] as const;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 p-6">
      <section className="panel px-6 py-7">
        <p className="section-kicker">Invite-First Access</p>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
          Review the private space before you join.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Invites are supposed to slow the boundary down just enough. Paste the
          link, preview the issuer and space, then accept only when it matches
          the circle you expected.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {reviewSteps.map(([title, body, Icon]) => (
            <div
              key={title}
              className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              <div className="flex items-center gap-2 text-brand-600">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  {title}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <InviteExplorer
        mode="companion"
        onAccept={(result) => {
          router.push(acceptedInviteHref(result));
        }}
      />
    </div>
  );
}
