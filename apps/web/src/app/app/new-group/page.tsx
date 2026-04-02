"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { StatusCallout } from "@/components/status-callout";
import { relayGroupApi } from "@/lib/relay";

export default function NewGroupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    joinRuleText: "",
    memberCap: 12,
    sensitiveMediaDefault: false,
  });
  const [createdGroup, setCreatedGroup] = useState<{ id: string; title: string } | null>(null);
  const [createdInvite, setCreatedInvite] = useState<Awaited<
    ReturnType<typeof relayGroupApi.createInvite>
  > | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  function inviteUrl() {
    return createdInvite?.inviteUrl ?? "";
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Group title is required before the group can be created.");
      return;
    }

    setIsCreatingGroup(true);

    try {
      const group = await relayGroupApi.createGroup({
        title: form.title.trim(),
        memberCap: form.memberCap,
        sensitiveMediaDefault: form.sensitiveMediaDefault,
        joinRuleText: form.joinRuleText.trim() || undefined,
      });

      setCreatedGroup({ id: group.id, title: group.title ?? form.title.trim() });
      toast.success("Group created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create group";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsCreatingGroup(false);
    }
  }

  async function generateInvite() {
    if (!createdGroup) {
      return;
    }

    setIsCreatingInvite(true);
    setInviteError(null);

    try {
      const invite = await relayGroupApi.createInvite(createdGroup.id, {
        expiresInHours: 72,
        maxUses: 12,
        note: "Review the group rules before posting or sharing private media.",
      });

      setCreatedInvite(invite);
      toast.success("Invite created");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create invite";
      setInviteError(message);
      toast.error(message);
    } finally {
      setIsCreatingInvite(false);
    }
  }

  async function copyInviteLink() {
    if (!createdInvite?.inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdInvite.inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Clipboard access failed");
    }
  }

  if (createdGroup) {
    return (
      <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
        <div className="eyebrow">Group Created</div>
        <h2 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          {createdGroup.title} is ready for its first invite.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          The group exists with the cap and safety defaults you chose. The next job is to mint the
          first invite and share it deliberately rather than dropping people into an undefined
          space.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Step 1</p>
            <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">Rules are set</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Join rules and media defaults are already attached to the group metadata.
            </p>
          </div>
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Step 2</p>
            <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">Mint one invite</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Share a single controlled invite rather than trying to onboard everyone manually.
            </p>
          </div>
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Step 3</p>
            <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">Hand off to native</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Keep the browser in control mode and let Android or desktop handle the actual vault
              and message flow.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {inviteError ? (
            <StatusCallout tone="error" title="Invite creation failed">
              {inviteError}
            </StatusCallout>
          ) : null}

          {createdInvite ? (
            <StatusCallout tone="success" title="First invite ready">
              Share <span className="font-mono text-xs">{inviteUrl()}</span> with the next member.
            </StatusCallout>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {!createdInvite ? (
            <button
              type="button"
              onClick={() => void generateInvite()}
              className="btn-primary"
              disabled={isCreatingInvite}
            >
              {isCreatingInvite ? "Creating Invite…" : "Create First Invite"}
            </button>
          ) : (
            <button type="button" onClick={() => void copyInviteLink()} className="btn-primary">
              Copy Invite Link
            </button>
          )}
          <button type="button" onClick={() => router.push("/app/discover")} className="btn-ghost">
            Open Invite Preview
          </button>
          <button
            type="button"
            onClick={() => {
              setCreatedGroup(null);
              setCreatedInvite(null);
              setInviteError(null);
              setForm({
                title: "",
                joinRuleText: "",
                memberCap: 12,
                sensitiveMediaDefault: false,
              });
            }}
            className="btn-ghost"
          >
            Create Another Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
        Invite-only groups
      </p>
      <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
        Create a small group with rules and safety defaults first
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
        The browser is for setting the group boundary. Use it to define the cap, keep invite
        control with organizers or admins, and make the join rule explicit before the first member arrives.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {formError ? (
          <StatusCallout tone="error" title="Group creation failed">
            {formError}
          </StatusCallout>
        ) : null}

        <div className="card space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Group title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="input"
              required
              maxLength={80}
              placeholder="Trusted hosts"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Join rule
            </label>
            <textarea
              value={form.joinRuleText}
              onChange={(event) =>
                setForm((current) => ({ ...current, joinRuleText: event.target.value }))
              }
              className="input resize-none"
              rows={4}
              maxLength={500}
              placeholder="Example: Consensual adults only. No reposting, no forwarding, no surprise additions."
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              This shows up in invite preview before someone joins.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                Member cap
              </label>
              <select
                value={String(form.memberCap)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, memberCap: Number(event.target.value) }))
                }
                className="input"
              >
                {[4, 6, 8, 10, 12].map((cap) => (
                  <option key={cap} value={cap}>
                    {cap} members
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">Beta defaults</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Owner or admin invite creation stays on. Member-created invites stay off in phase 1.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <input
              type="checkbox"
              checked={form.sensitiveMediaDefault}
              onChange={(event) =>
                setForm((current) => ({ ...current, sensitiveMediaDefault: event.target.checked }))
              }
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text-primary)]">
                Stronger media protections enabled
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
                New attachments use the standard profile by default. Turn this on when the group
                should begin with blur-and-reveal behavior and stricter handling.
              </span>
            </span>
          </label>

          <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <span className="block text-sm font-medium text-[var(--text-primary)]">
              Organizer-managed invites
            </span>
            <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
              Phase 1 keeps invite creation with organizers and admins only. Member-created invites
              can return later if a larger community explicitly needs them.
            </span>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isCreatingGroup}>
          {isCreatingGroup ? "Creating..." : "Create Group"}
        </button>
      </form>
    </div>
  );
}
