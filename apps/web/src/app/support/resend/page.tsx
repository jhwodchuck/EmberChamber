"use client";

import Link from "next/link";
import { useState } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { StatusCallout } from "@/components/status-callout";

const relayUrl =
  process.env.NEXT_PUBLIC_RELAY_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";

export default function ResendMagicLinkPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setBusy(true);
    setSent(false);
    setError(null);

    try {
      const res = await fetch(`${relayUrl}/v1/auth/resend-magic-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many requests. Wait a few minutes and try again.");
        } else {
          setError("Could not reach the relay. Try again in a moment.");
        }
        return;
      }

      setSent(true);
    } catch {
      setError("Could not reach the relay. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingShell>
      <section className="mx-auto max-w-2xl px-6 py-20 sm:py-24">
        <div className="panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="eyebrow">Sign-in help</div>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Resend your sign-in link.
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">
            Enter the private email tied to your beta account. If it matches an
            existing account, we will send a fresh magic link immediately.
          </p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            We return the same response whether or not the address matches an
            account, so this form cannot be used to check whether an email is
            registered.
          </p>

          {!sent ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mt-1.5 block w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ember-500)]"
                />
              </div>

              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="btn-primary w-full disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
          ) : null}

          {error ? (
            <div className="mt-6">
              <StatusCallout tone="error" title="Request failed">{error}</StatusCallout>
            </div>
          ) : null}

          {sent ? (
            <div className="mt-6 space-y-4">
              <StatusCallout tone="success" title="Check your inbox">
                If this email matches a beta account, a sign-in link is on its way. Open it on
                the device you want to use. Check your spam folder if it does not arrive within
                a few minutes.
              </StatusCallout>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="btn-ghost"
              >
                Try a different address
              </button>
            </div>
          ) : null}

          <div className="mt-8 border-t border-[var(--border)] pt-6 text-sm text-[var(--text-secondary)]">
            New to EmberChamber?{" "}
            <Link href="/support/invite" className="font-medium text-brand-600 hover:underline">
              Check your invite code first
            </Link>
            , then{" "}
            <Link href="/register" className="font-medium text-brand-600 hover:underline">
              register
            </Link>
            .
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
