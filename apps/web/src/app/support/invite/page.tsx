"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { StatusCallout } from "@/components/status-callout";

type InviteStatus =
  | { status: "valid"; expiresAt?: string; usesRemaining: number | null }
  | { status: "exhausted" }
  | { status: "expired"; expiresAt?: string }
  | { status: "revoked" }
  | { status: "not_found" };

const relayUrl =
  process.env.NEXT_PUBLIC_RELAY_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";

export default function InviteCheckPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InviteStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setBusy(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${relayUrl}/v1/invite/check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many checks. Wait a few minutes and try again.");
        } else {
          setError("Could not reach the relay. Try again in a moment.");
        }
        return;
      }

      const data = (await res.json()) as InviteStatus;
      setResult(data);
    } catch {
      setError("Could not reach the relay. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function formatExpiry(iso?: string) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  }

  return (
    <MarketingShell>
      <section className="mx-auto max-w-2xl px-6 py-20 sm:py-24">
        <div className="panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="eyebrow">Invite check</div>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Check your invite code.
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
            Enter the invite code you received to see whether it is still valid
            before you start registration.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
            <div>
              <label
                htmlFor="invite-code"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Invite code
              </label>
              <input
                id="invite-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ember-abc123"
                autoComplete="off"
                spellCheck={false}
                className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ember-500)]"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Checking…" : "Check invite"}
            </button>
          </form>

          {error ? (
            <div className="mt-6">
              <StatusCallout tone="error" title="Check failed">{error}</StatusCallout>
            </div>
          ) : null}

          {result ? (
            <div className="mt-6">
              {result.status === "valid" ? (
                <StatusCallout tone="success" title="Invite is valid">
                  {[
                    result.usesRemaining !== null
                      ? `${result.usesRemaining} use${result.usesRemaining === 1 ? "" : "s"} remaining.`
                      : "Unlimited uses remaining.",
                    result.expiresAt
                      ? `Expires ${formatExpiry(result.expiresAt)}.`
                      : "No expiry date.",
                  ].join(" ")}
                </StatusCallout>
              ) : result.status === "exhausted" ? (
                <StatusCallout tone="error" title="Invite is exhausted">
                  This code has been used up. Ask whoever sent yours to create a fresh invite.
                </StatusCallout>
              ) : result.status === "expired" ? (
                <StatusCallout tone="error" title="Invite has expired">
                  {result.expiresAt
                    ? `This code expired on ${formatExpiry(result.expiresAt)}. Ask whoever sent yours for a new one.`
                    : "This code has expired. Ask whoever sent yours for a new one."}
                </StatusCallout>
              ) : result.status === "revoked" ? (
                <StatusCallout tone="error" title="Invite was revoked">
                  This code is no longer active. Ask whoever sent yours to issue a replacement.
                </StatusCallout>
              ) : (
                <StatusCallout tone="warning" title="Invite not found">
                  This code does not match any beta invite. Check for typos or ask whoever sent yours to confirm the exact code.
                </StatusCallout>
              )}
            </div>
          ) : null}

          {result?.status === "valid" ? (
            <div className="mt-6">
              <Link href="/register" className="btn-primary">
                Register now
              </Link>
            </div>
          ) : null}

          <div className="mt-8 border-t border-[var(--border)] pt-6 text-sm text-[var(--text-secondary)]">
            Already have a beta account?{" "}
            <Link href="/support/resend" className="font-medium text-brand-600 hover:underline">
              Resend your sign-in link
            </Link>{" "}
            instead.
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
