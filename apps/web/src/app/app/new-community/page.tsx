"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { StatusCallout } from "@/components/status-callout";
import { relayConversationApi } from "@/lib/relay";

export default function NewCommunityPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    joinRuleText: "",
    memberCap: 150,
    defaultRoomTitle: "General",
    sensitiveMediaDefault: false,
    allowMemberInvites: false,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Community title is required.");
      return;
    }

    setIsCreating(true);
    try {
      const community = await relayConversationApi.createCommunity({
        title: form.title.trim(),
        memberCap: form.memberCap,
        defaultRoomTitle: form.defaultRoomTitle.trim() || "General",
        sensitiveMediaDefault: form.sensitiveMediaDefault,
        allowMemberInvites: form.allowMemberInvites,
        joinRuleText: form.joinRuleText.trim() || undefined,
      });
      toast.success("Community created");
      router.push(`/app/community/${community.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create community";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
        Closed beta communities
      </p>
      <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
        Create an invite-gated community with rooms
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
        Use communities when a trusted circle is bigger than one small group and needs room-level
        boundaries without turning into a public discovery surface.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {formError ? (
          <StatusCallout tone="error" title="Community creation failed">
            {formError}
          </StatusCallout>
        ) : null}

        <div className="card space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Community title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="input"
              maxLength={80}
              required
              placeholder="Trusted hosts collective"
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
              placeholder="Adults only. Invite-only. No reposting, no forwarding, no surprise additions."
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              This appears in invite preview before someone joins.
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
                {[50, 100, 150, 200, 250].map((cap) => (
                  <option key={cap} value={cap}>
                    {cap} members
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                Default room title
              </label>
              <input
                type="text"
                value={form.defaultRoomTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, defaultRoomTitle: event.target.value }))
                }
                className="input"
                maxLength={80}
                placeholder="General"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-primary)] p-4">
            <input
              type="checkbox"
              checked={form.allowMemberInvites}
              onChange={(event) =>
                setForm((current) => ({ ...current, allowMemberInvites: event.target.checked }))
              }
              className="mt-1 h-4 w-4 rounded border-[var(--border)] text-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text-primary)]">
                Enable member invites
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
                Closed beta phase 2 can allow trusted members to share invites when organizers want
                that. You can freeze invites later without deleting the community.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-primary)] p-4">
            <input
              type="checkbox"
              checked={form.sensitiveMediaDefault}
              onChange={(event) =>
                setForm((current) => ({ ...current, sensitiveMediaDefault: event.target.checked }))
              }
              className="mt-1 h-4 w-4 rounded border-[var(--border)] text-brand-600"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--text-primary)]">
                Enable stronger media defaults
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">
                New rooms and attachments stay on the standard profile unless organizers explicitly
                raise the privacy posture.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={isCreating}>
            {isCreating ? "Creating Community…" : "Create Community"}
          </button>
          <button type="button" onClick={() => router.push("/app")} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
