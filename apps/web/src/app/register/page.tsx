"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { startMagicLink } from "@/lib/relay";

const authBootstrapEnabled =
  process.env.NEXT_PUBLIC_EMBERCHAMBER_AUTH_BOOTSTRAP_ENABLED === "true";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("Beta primary device");
  const [challenge, setChallenge] = useState<{
    expiresAt: string;
    debugCompletionToken?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authBootstrapEnabled) {
      toast.error("Beta onboarding is not enabled on this deployment yet.");
      return;
    }

    startTransition(async () => {
      try {
        const nextChallenge = await startMagicLink({
          email,
          inviteToken,
          deviceLabel,
        });
        setChallenge(nextChallenge);
        toast.success("Beta link queued");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to start beta onboarding");
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3 mb-3">
            <Image
              src="/brand/emberchamber-mark.svg"
              alt="EmberChamber"
              width={72}
              height={72}
              priority
            />
            <Image
              src="/brand/emberchamber-wordmark.svg"
              alt="EmberChamber"
              width={280}
              height={54}
              className="h-auto w-[220px]"
            />
          </div>
          <p className="text-[var(--text-secondary)]">Join the invite-only beta</p>
        </div>

        <div className="card space-y-5">
          {!authBootstrapEnabled ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">Closed beta onboarding is not live here yet</p>
              <p className="mt-1">
                The public site is up, but invite-driven email bootstrap is waiting on a production mail channel before it is turned on.
              </p>
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Beta invite token
              </label>
              <input
                type="text"
                className="input"
                value={inviteToken}
                onChange={(event) => setInviteToken(event.target.value)}
                placeholder="Paste your invite token"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                First device label
              </label>
              <input
                type="text"
                className="input"
                value={deviceLabel}
                onChange={(event) => setDeviceLabel(event.target.value)}
                placeholder="Android beta phone"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={isPending || !authBootstrapEnabled}
            >
              {authBootstrapEnabled
                ? isPending
                  ? "Queuing magic link..."
                  : "Start beta onboarding"
                : "Invite bootstrap coming soon"}
            </button>
          </form>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">Beta defaults</p>
            <p className="mt-1">DMs and small groups only. No public usernames, no discovery, and no phone numbers.</p>
          </div>

          {challenge ? (
            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 text-sm">
              <p className="font-medium text-[var(--text-primary)]">Almost there</p>
              <p className="mt-1 text-[var(--text-secondary)]">
                Your beta magic link expires at {new Date(challenge.expiresAt).toLocaleString()}.
              </p>
              {challenge.debugCompletionToken ? (
                <p className="mt-3 font-mono text-xs text-brand-500 break-all">
                  Dev token: {challenge.debugCompletionToken}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          Already have an invite?{" "}
          <Link href="/login" className="text-brand-500 hover:underline font-medium">
            Request a sign-in link
          </Link>
        </p>
      </div>
    </div>
  );
}
