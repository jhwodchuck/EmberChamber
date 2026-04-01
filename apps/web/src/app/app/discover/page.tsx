"use client";

import { useState } from "react";
import { invitesApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface InvitePreview {
  invite: {
    code: string;
    expires_at?: string | null;
    max_uses?: number | null;
    use_count?: number;
  };
  target?: {
    id: string;
    type?: string;
    name?: string;
    description?: string;
    member_count?: number;
  } | null;
}

function normalizeInviteCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? trimmed;
  } catch {
    return trimmed;
  }
}

export default function DiscoverPage() {
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  async function handlePreview(rawValue?: string) {
    const code = normalizeInviteCode(rawValue ?? inviteInput);
    setInviteInput(code);

    if (code.length < 4) {
      setPreview(null);
      return;
    }

    setIsLoading(true);
    try {
      const data = await invitesApi.preview(code);
      setPreview(data as InvitePreview);
    } catch (err: unknown) {
      setPreview(null);
      toast.error(err instanceof Error ? err.message : "Invite not found");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleJoin() {
    if (!preview?.invite.code) return;

    setIsJoining(true);
    try {
      const result = await invitesApi.accept(preview.invite.code);
      toast.success("Invite accepted");

      if (result.conversationId) {
        router.push(`/app/chat/${result.conversationId}`);
        return;
      }

      if (result.channelId) {
        router.push(`/app/channel/${result.channelId}`);
        return;
      }

      router.push("/app");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsJoining(false);
    }
  }

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
          PrivateMesh communities are designed to be gated by the people who run
          them. Paste an invite code or invite link to preview the destination
          before you join.
        </p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
            Invite code or link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="input flex-1"
              placeholder="Paste an invite code or /invite/... link"
              autoFocus
            />
            <button
              type="button"
              onClick={() => handlePreview()}
              className="btn-primary whitespace-nowrap"
              disabled={isLoading}
            >
              {isLoading ? "Checking..." : "Preview"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          {preview ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
                  {preview.target?.type === "group"
                    ? "Private Group"
                    : preview.target?.type === "dm"
                      ? "Direct Conversation"
                      : "Private Channel"}
                </p>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-1">
                  {preview.target?.name ?? "Invite destination"}
                </h3>
                {preview.target?.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {preview.target.description}
                  </p>
                )}
              </div>

              <div className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                <p>
                  Code:{" "}
                  <span className="font-mono text-[var(--text-primary)]">
                    {preview.invite.code}
                  </span>
                </p>
                <p>
                  Uses:{" "}
                  <span className="text-[var(--text-primary)]">
                    {preview.invite.use_count ?? 0}
                    {preview.invite.max_uses ? ` / ${preview.invite.max_uses}` : ""}
                  </span>
                </p>
                {preview.invite.expires_at && (
                  <p className="sm:col-span-2">
                    Expires:{" "}
                    <span className="text-[var(--text-primary)]">
                      {new Date(preview.invite.expires_at).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleJoin}
                  className="btn-primary"
                  disabled={isJoining}
                >
                  {isJoining ? "Joining..." : "Accept invite"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInviteInput("");
                    setPreview(null);
                  }}
                  className="btn-ghost"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                No public directory
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                This starter now assumes communities are joined intentionally,
                not discovered through a public catalog. Invite links are the
                primary entry point.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
