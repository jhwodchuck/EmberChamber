"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { invitesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
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
  } | null;
}

export default function InviteLandingPage() {
  const params = useParams<{ code: string }>();
  const inviteCode = params?.code ?? "";
  const router = useRouter();
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setIsFetching(true);
      try {
        const data = await invitesApi.preview(inviteCode);
        if (!cancelled) {
          setPreview(data as InvitePreview);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Invite not found");
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    loadInvite();

    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  async function acceptInvite() {
    setIsJoining(true);
    try {
      const result = await invitesApi.accept(inviteCode);
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

  const authRedirect = `/invite/${inviteCode}`;

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brand-500">
            PrivateMesh Invite
          </p>
          <h1 className="text-4xl font-bold text-[var(--text-primary)]">
            Preview a private community invite
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-secondary)]">
            PrivateMesh uses invite-first access for communities and channels.
            Review the destination before you join.
          </p>
        </div>

        <div className="card">
          {isFetching ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
                  {preview.target?.type === "group"
                    ? "Private Group"
                    : preview.target?.type === "dm"
                      ? "Direct Conversation"
                      : "Private Channel"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                  {preview.target?.name ?? "Invite destination"}
                </h2>
                {preview.target?.description && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {preview.target.description}
                  </p>
                )}
              </div>

              <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                <p>
                  Invite code:{" "}
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

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Trust boundary
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  This starter emphasizes private, gated access. It does not yet
                  implement full end-to-end encrypted direct-message delivery, so
                  the product language now stays precise about current behavior.
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : isAuthenticated ? (
                <button
                  type="button"
                  onClick={acceptInvite}
                  className="btn-primary w-full py-3"
                  disabled={isJoining}
                >
                  {isJoining ? "Joining..." : "Accept invite"}
                </button>
              ) : (
                <div className="space-y-3">
                  <Link
                    href={`/login?next=${encodeURIComponent(authRedirect)}`}
                    className="btn-primary block w-full py-3 text-center"
                  >
                    Sign in to join
                  </Link>
                  <Link
                    href={`/register?next=${encodeURIComponent(authRedirect)}`}
                    className="btn-ghost block w-full py-3 text-center"
                  >
                    Create account and join
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-lg font-medium text-[var(--text-primary)]">
                This invite is unavailable
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The invite may be expired, revoked, or malformed.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
