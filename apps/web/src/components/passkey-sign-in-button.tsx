"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { relayPasskeyApi, storeRelaySession } from "@/lib/relay";

export function PasskeySignInButton({ continueTo }: { continueTo?: string | null }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function signInWithPasskey() {
    setIsPending(true);
    try {
      const { challengeToken, options } = await relayPasskeyApi.authOptions();
      const authResp = await startAuthentication({
        optionsJSON: options as unknown as PublicKeyCredentialRequestOptionsJSON,
      });
      const session = await relayPasskeyApi.authVerify(challengeToken, authResp, "Web browser");
      storeRelaySession(session);
      router.push(continueTo ?? "/app");
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        // User dismissed the native prompt — not an error worth toasting.
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Passkey sign-in failed. Try email magic-link instead.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4 text-center">
      <button
        type="button"
        onClick={() => void signInWithPasskey()}
        disabled={isPending}
        className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
      >
        {isPending ? "Waiting for passkey…" : "Sign in with a passkey instead"}
      </button>
    </div>
  );
}
