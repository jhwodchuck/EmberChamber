"use client";

import { useRouter } from "next/navigation";
import { InviteExplorer } from "@/components/invite-explorer";

export default function DiscoverPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500 mb-2">
          Invite-First Access
        </p>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Join a private space with an invite
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-xl">
          EmberChamber communities are designed to be gated by the people who run
          them. Paste an invite code or invite link to preview the destination
          before you join.
        </p>
      </div>

      <InviteExplorer
        mode="companion"
        onAccept={(result) => {
          router.push("/app");
        }}
      />
    </div>
  );
}
