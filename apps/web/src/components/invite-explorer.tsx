"use client";

import Link from "next/link";
import { ClipboardPaste, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatUtcDateTime } from "@/lib/format";
import { hasRelaySession, relayConversationApi } from "@/lib/relay";
import { StatusCallout } from "@/components/status-callout";

type NormalizedInvite = {
  conversationId: string;
  inviteToken: string;
};

function normalizeInviteReference(value: string): NormalizedInvite | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split("/").filter(Boolean);
    const inviteIndex = segments.findIndex((segment) => segment === "invite");
    if (inviteIndex >= 0 && segments.length >= inviteIndex + 3) {
      return {
        conversationId: segments[inviteIndex + 1] ?? "",
        inviteToken: segments[inviteIndex + 2] ?? "",
      };
    }
  } catch {
    // Fall through to raw parsing.
  }

  const slashParts = trimmed.split("/").filter(Boolean);
  if (slashParts.length >= 2) {
    return {
      conversationId: slashParts[slashParts.length - 2] ?? "",
      inviteToken: slashParts[slashParts.length - 1] ?? "",
    };
  }

  const colonParts = trimmed.split(":");
  if (colonParts.length === 2) {
    return {
      conversationId: colonParts[0] ?? "",
      inviteToken: colonParts[1] ?? "",
    };
  }

  return null;
}

export function InviteExplorer({
  initialConversationId = "",
  initialToken = "",
  mode = "companion",
  onAccept,
}: {
  initialConversationId?: string;
  initialToken?: string;
  mode?: "companion" | "public";
  onAccept: (result: {
    conversationId: string;
    rootConversationId: string;
    rootConversationKind: "group" | "community";
  }) => void;
}) {
  const initialRef =
    initialConversationId && initialToken ? `${initialConversationId}/${initialToken}` : "";
  const [inviteInput, setInviteInput] = useState(initialRef);
  const [preview, setPreview] = useState<Awaited<
    ReturnType<typeof relayConversationApi.previewInvite>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    setSessionReady(hasRelaySession());
  }, []);

  const normalizedInvite = useMemo(() => normalizeInviteReference(inviteInput), [inviteInput]);

  const previewInvite = useCallback(async (rawValue: string) => {
    const normalized = normalizeInviteReference(rawValue);
    setPreviewError(null);
    setPreview(null);
    setInviteInput(rawValue.trim());

    if (!normalized?.conversationId || !normalized.inviteToken) {
      return;
    }

    setIsLoading(true);
    try {
      const data = await relayConversationApi.previewInvite(
        normalized.conversationId,
        normalized.inviteToken,
      );
      setPreview(data);
      setInviteInput(`${normalized.conversationId}/${normalized.inviteToken}`);
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : "Invite preview failed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialConversationId && initialToken) {
      void previewInvite(`${initialConversationId}/${initialToken}`);
    }
  }, [initialConversationId, initialToken, previewInvite]);

  async function handlePreview(rawValue?: string) {
    await previewInvite(rawValue ?? inviteInput);
  }

  async function pasteFromClipboard() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText.trim()) {
        setPreviewError("Clipboard is empty. Copy an invite link first.");
        return;
      }

      await handlePreview(clipboardText);
    } catch {
      setPreviewError("Clipboard access is blocked. Paste the invite manually instead.");
    }
  }

  async function handleJoin() {
    if (!normalizedInvite) {
      return;
    }

    setIsJoining(true);

    try {
      const result = await relayConversationApi.acceptInvite(
        normalizedInvite.conversationId,
        normalizedInvite.inviteToken,
      );
      toast.success("Invite accepted");
      onAccept({
        conversationId: result.conversationId,
        rootConversationId: result.rootConversationId,
        rootConversationKind: result.rootConversationKind,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setIsJoining(false);
    }
  }

  const nextInvitePath = normalizedInvite
    ? `/invite/${normalizedInvite.conversationId}/${normalizedInvite.inviteToken}`
    : "/invite";

  return (
    <div className="card space-y-5">
      <div>
        <label
          htmlFor="invite-input"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Invite Link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="invite-input"
            type="text"
            value={inviteInput}
            onChange={(event) => setInviteInput(event.target.value)}
            className="input flex-1"
            placeholder="Paste an /invite/{conversationId}/{token} link…"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => void handlePreview()}
            className="btn-primary whitespace-nowrap"
            disabled={isLoading || !normalizedInvite}
          >
            {isLoading ? "Checking…" : "Preview Invite"}
          </button>
          <button type="button" onClick={() => void pasteFromClipboard()} className="btn-ghost">
            <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
            Paste
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Invite links include the target private space and the invite token together.
        </p>
      </div>

      {previewError ? (
        <StatusCallout tone="error" title="Invite preview failed">
          {previewError}
        </StatusCallout>
      ) : null}

      {preview ? (
        <div className="space-y-4 rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
              Invite-only space
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {preview.room?.title ?? preview.conversation.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Issued by {preview.invite.inviterDisplayName}. Member cap {preview.conversation.memberCap},
              current members {preview.conversation.memberCount}.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
            <p>
              Status: <span className="font-medium text-[var(--text-primary)]">{preview.invite.status}</span>
            </p>
            <p>
              Uses:{" "}
              <span className="text-[var(--text-primary)]">
                {preview.invite.useCount}
                {preview.invite.maxUses ? ` / ${preview.invite.maxUses}` : ""}
              </span>
            </p>
            <p>
              Space:{" "}
              <span className="font-medium capitalize text-[var(--text-primary)]">
                {preview.conversation.kind}
              </span>
            </p>
            <p>
              Scope:{" "}
              <span className="font-medium capitalize text-[var(--text-primary)]">
                {preview.invite.scope.replace("_", " ")}
              </span>
            </p>
            {preview.invite.expiresAt ? (
              <p className="sm:col-span-2">
                Expires:{" "}
                <span className="text-[var(--text-primary)]">
                  {formatUtcDateTime(preview.invite.expiresAt)}
                </span>
              </p>
            ) : null}
          </div>

          {preview.conversation.joinRuleText ? (
            <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-primary)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                Join rule
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {preview.conversation.joinRuleText}
              </p>
            </div>
          ) : null}

          {preview.room ? (
            <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-primary)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                Target room
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {preview.room.title} with {preview.room.memberCount} members and a{" "}
                {preview.room.roomAccessPolicy.replace("_", " ")} access policy.
              </p>
            </div>
          ) : null}

          {preview.invite.note ? (
            <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-primary)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                Inviter note
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {preview.invite.note}
              </p>
            </div>
          ) : null}

          {preview.conversation.sensitiveMediaDefault ? (
            <StatusCallout tone="warning" title="Sensitive media defaults are enabled">
              This space is configured for stronger leak deterrence by default.
            </StatusCallout>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            {mode === "companion" || sessionReady ? (
              <button
                type="button"
                onClick={() => void handleJoin()}
                className="btn-primary"
                disabled={isJoining || preview.invite.status !== "active"}
              >
                {isJoining ? "Joining…" : "Join with Invite"}
              </button>
            ) : (
              <>
                <Link
                  href={`/login?next=${encodeURIComponent(nextInvitePath)}`}
                  className="btn-primary"
                >
                  Request Sign-In Link
                </Link>
                <Link href="/register" className="btn-ghost">
                  Join the Beta
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() =>
                toast("Invite previews stay browser-safe. Open the native client after joining.")
              }
              className="btn-ghost"
            >
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              Why preview first?
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
