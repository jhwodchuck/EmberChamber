"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDate } from "@/lib/format";
import { relayAdminApi, type AdminAccountLookup } from "@/lib/relay";

type HandoffResult = {
  sessionsRevoked: number;
  completionUrl: string;
  expiresAt: string;
};

export default function AdminAccountPage() {
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState<AdminAccountLookup | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [reason, setReason] = useState("");
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);

  async function runSuspend() {
    if (!account) return;
    const confirmed = window.confirm(
      `Suspend ${account.displayName}? This will also revoke all active sessions.`,
    );
    if (!confirmed) return;
    setIsSuspending(true);
    try {
      await relayAdminApi.suspendAccount(account.id, suspendReason.trim() || undefined);
      toast.success("Account suspended.");
      const refreshed = await relayAdminApi.lookupAccount(account.id);
      if (refreshed.account) setAccount(refreshed.account);
      setSuspendReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suspend failed.");
    } finally {
      setIsSuspending(false);
    }
  }

  async function runUnsuspend() {
    if (!account) return;
    const confirmed = window.confirm(`Unsuspend ${account.displayName}?`);
    if (!confirmed) return;
    setIsSuspending(true);
    try {
      await relayAdminApi.unsuspendAccount(account.id);
      toast.success("Account unsuspended.");
      const refreshed = await relayAdminApi.lookupAccount(account.id);
      if (refreshed.account) setAccount(refreshed.account);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unsuspend failed.");
    } finally {
      setIsSuspending(false);
    }
  }

  async function lookup() {
    if (!query.trim()) return;
    setIsLooking(true);
    setNotFound(false);
    setAccount(null);
    setHandoff(null);
    try {
      const result = await relayAdminApi.lookupAccount(query.trim());
      if (result.account) {
        setAccount(result.account);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setIsLooking(false);
    }
  }

  async function runHandoff() {
    if (!account) return;
    const confirmed = window.confirm(
      `Force-signout all sessions for ${account.displayName} and mint a recovery link? This immediately revokes every active device.`,
    );
    if (!confirmed) return;
    setIsHandingOff(true);
    try {
      const result = await relayAdminApi.recoveryHandoff(
        account.id,
        reason.trim() || undefined,
      );
      setHandoff({
        sessionsRevoked: result.sessionsRevoked,
        completionUrl: result.completionUrl,
        expiresAt: result.expiresAt,
      });
      toast.success("Recovery handoff issued.");
      // Refresh active-session count.
      const refreshed = await relayAdminApi.lookupAccount(account.id);
      if (refreshed.account) setAccount(refreshed.account);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Handoff failed.");
    } finally {
      setIsHandingOff(false);
    }
  }

  async function copyLink() {
    if (!handoff) return;
    try {
      await navigator.clipboard.writeText(handoff.completionUrl);
      toast.success("Recovery link copied.");
    } catch {
      toast.error("Could not copy. Select and copy the link manually.");
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card space-y-3">
        <div>
          <label
            htmlFor="account-query"
            className="mb-1 block text-sm font-medium text-[var(--text-primary)]"
          >
            Find an account
          </label>
          <p className="text-xs text-[var(--text-secondary)]">
            Search by account ID or email. Email is matched via the blind index;
            the plaintext is never exposed here.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            id="account-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void lookup();
            }}
            placeholder="account id or email"
            className="flex-1 rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
          <button
            type="button"
            onClick={() => void lookup()}
            disabled={isLooking || !query.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {isLooking ? "Searching…" : "Look up"}
          </button>
        </div>
      </div>

      {notFound ? (
        <StatusCallout tone="warning" title="No account found">
          Nothing matched that query. Check the account ID or email and try
          again.
        </StatusCallout>
      ) : null}

      {account ? (
        <div className="card space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {account.displayName}
              </h2>
              {account.isOperator ? (
                <span className="rounded bg-brand-500/10 px-1.5 py-0.5 text-xs text-brand-600">
                  Operator
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              @{account.username} · {account.id}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Joined {formatUtcDate(account.createdAt)} UTC ·{" "}
              {account.activeSessionCount} active session
              {account.activeSessionCount === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Account recovery handoff
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Use when the account holder has lost all devices. This force-signs-out
              every active session and mints a single-use magic link that
              re-bootstraps a fresh device on the same account identity. Deliver
              the link out-of-band.
            </p>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="reason (optional, recorded in audit log)"
              className="w-full rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
            <button
              type="button"
              onClick={() => void runHandoff()}
              disabled={isHandingOff}
              className="text-sm font-medium text-red-400 hover:text-red-500 disabled:opacity-50"
            >
              {isHandingOff
                ? "Issuing handoff…"
                : "Force-signout all & issue recovery link"}
            </button>
          </div>

          {handoff ? (
            <StatusCallout tone="success" title="Recovery link issued">
              <p>
                Revoked {handoff.sessionsRevoked} session
                {handoff.sessionsRevoked === 1 ? "" : "s"}. The link expires{" "}
                {formatUtcDate(handoff.expiresAt)} UTC.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-primary)]">
                  {handoff.completionUrl}
                </code>
                <button type="button" onClick={() => void copyLink()} className="btn-ghost">
                  Copy
                </button>
              </div>
            </StatusCallout>
          ) : null}

          <div className="space-y-2 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Account suspension
            </h3>
            {account.isSuspended ? (
              <>
                <p className="text-xs text-[var(--text-secondary)]">
                  Suspended {account.suspendedAt ? `${formatUtcDate(account.suspendedAt)} UTC` : ""}
                  {account.suspensionReason ? ` — ${account.suspensionReason}` : ""}.
                  All sessions were revoked and new tokens are rejected.
                </p>
                <button
                  type="button"
                  onClick={() => void runUnsuspend()}
                  disabled={isSuspending}
                  className="text-sm font-medium text-brand-400 hover:text-brand-500 disabled:opacity-50"
                >
                  {isSuspending ? "Lifting suspension…" : "Unsuspend account"}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-[var(--text-secondary)]">
                  Suspending blocks all authenticated access and revokes every
                  active session immediately. Use for severe abuse or compromised
                  accounts.
                </p>
                <input
                  value={suspendReason}
                  onChange={(event) => setSuspendReason(event.target.value)}
                  placeholder="reason (optional, recorded in audit log)"
                  className="w-full rounded-[1rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => void runSuspend()}
                  disabled={isSuspending}
                  className="text-sm font-medium text-red-400 hover:text-red-500 disabled:opacity-50"
                >
                  {isSuspending ? "Suspending…" : "Suspend account"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
