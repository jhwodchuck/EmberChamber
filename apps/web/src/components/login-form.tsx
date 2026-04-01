"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { startMagicLink } from "@/lib/relay";
import { authBootstrapEnabled } from "@/lib/site";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("Web companion");
  const [challenge, setChallenge] = useState<{
    expiresAt: string;
    debugCompletionToken?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authBootstrapEnabled) {
      toast.error("Email sign-in is not enabled on this deployment yet.");
      return;
    }

    startTransition(async () => {
      try {
        const nextChallenge = await startMagicLink({
          email,
          deviceLabel,
        });
        setChallenge(nextChallenge);
        toast.success("Magic link queued");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to send magic link");
      }
    });
  }

  return (
    <div className="panel p-6 sm:p-7">
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex flex-col items-center gap-3">
          <Image src="/brand/emberchamber-mark.svg" alt="EmberChamber" width={72} height={72} priority />
          <Image
            src="/brand/emberchamber-wordmark.svg"
            alt="EmberChamber"
            width={280}
            height={54}
            className="h-auto w-[220px]"
          />
        </div>
        <p className="text-[var(--text-secondary)]">Sign in with a private email magic link.</p>
      </div>

      <div className="space-y-5">
        {!authBootstrapEnabled ? (
          <div className="rounded-[1.35rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">Closed beta bootstrap is not live here yet</p>
            <p className="mt-1">
              This public deployment is active, but email-based account bootstrap is still being
              wired to a production mail provider.
            </p>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input"
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Device label
            </label>
            <input
              type="text"
              value={deviceLabel}
              onChange={(event) => setDeviceLabel(event.target.value)}
              className="input"
              placeholder="Windows beta laptop"
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full py-3"
            disabled={isPending || !authBootstrapEnabled}
          >
            {authBootstrapEnabled
              ? isPending
                ? "Sending link..."
                : "Send magic link"
              : "Email bootstrap coming soon"}
          </button>
        </form>

        <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">Trust boundary</p>
          <p className="mt-1">
            Email is used only for bootstrap and recovery. It is never public, searchable, or used
            for discovery.
          </p>
        </div>

        {challenge ? (
          <div className="rounded-[1.35rem] border border-brand-500/20 bg-brand-500/5 p-4 text-sm">
            <p className="font-medium text-[var(--text-primary)]">Check your inbox</p>
            <p className="mt-1 text-[var(--text-secondary)]">
              The link expires at {new Date(challenge.expiresAt).toLocaleString()}.
            </p>
            {challenge.debugCompletionToken ? (
              <p className="mt-3 break-all font-mono text-xs text-brand-500">
                Dev token: {challenge.debugCompletionToken}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        New here?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          Request beta access
        </Link>
      </p>
    </div>
  );
}
