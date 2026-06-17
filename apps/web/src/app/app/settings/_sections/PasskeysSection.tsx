"use client";

import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDate } from "@/lib/format";
import { relayPasskeyApi, type PasskeyCredentialRef } from "@/lib/relay";

type LoadStatus = "idle" | "loading" | "ready" | "error";

export function PasskeysSection() {
  const [passkeys, setPasskeys] = useState<PasskeyCredentialRef[]>([]);
  const [status, setStatus] = useState<{ state: LoadStatus; message?: string }>({
    state: "idle",
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setStatus({ state: "loading" });
    try {
      setPasskeys(await relayPasskeyApi.listPasskeys());
      setStatus({ state: "ready" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to load passkeys.",
      });
    }
  }

  async function registerPasskey() {
    setIsRegistering(true);
    try {
      const optionsRaw = await relayPasskeyApi.registerOptions();
      const attResp = await startRegistration({
        optionsJSON: optionsRaw as unknown as PublicKeyCredentialCreationOptionsJSON,
      });
      await relayPasskeyApi.registerVerify(attResp);
      toast.success("Passkey registered.");
      await load();
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        toast.error("Passkey registration was cancelled.");
      } else {
        toast.error(err instanceof Error ? err.message : "Registration failed.");
      }
    } finally {
      setIsRegistering(false);
    }
  }

  async function removePasskey(credentialId: string) {
    if (!window.confirm("Remove this passkey? You can register it again later.")) {
      return;
    }
    setRemovingId(credentialId);
    try {
      await relayPasskeyApi.removePasskey(credentialId);
      toast.success("Passkey removed.");
      setPasskeys((prev) => prev.filter((p) => p.credentialId !== credentialId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove passkey.");
    } finally {
      setRemovingId(null);
    }
  }

  const transportLabel = (transports: string[]) => {
    if (!transports.length) return null;
    return transports
      .map((t) =>
        t === "internal"
          ? "built-in"
          : t === "hybrid"
            ? "phone/tablet"
            : t === "usb"
              ? "USB key"
              : t,
      )
      .join(", ");
  };

  return (
    <div
      id="settings-panel-security"
      role="tabpanel"
      aria-labelledby="settings-tab-security"
      className="space-y-4"
    >
      <p className="text-sm text-[var(--text-secondary)]">
        Passkeys let you sign in with your device biometrics or a hardware key —
        no email needed. Each registered passkey can authenticate you on any
        device that stores it.
      </p>

      {status.state === "error" ? (
        <StatusCallout tone="warning" title="Could not load passkeys">
          {status.message}
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 block text-xs underline"
          >
            Retry
          </button>
        </StatusCallout>
      ) : null}

      {status.state === "ready" && passkeys.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)]">
          No passkeys registered yet.
        </p>
      ) : null}

      {passkeys.length > 0 ? (
        <ul className="space-y-2">
          {passkeys.map((pk) => (
            <li
              key={pk.credentialId}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  …{pk.credentialId.slice(-8)}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Added {formatUtcDate(pk.createdAt)} UTC
                  {transportLabel(pk.transports)
                    ? ` · ${transportLabel(pk.transports)}`
                    : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removePasskey(pk.credentialId)}
                disabled={removingId === pk.credentialId}
                className="text-xs text-red-400 hover:text-red-500 disabled:opacity-40"
              >
                {removingId === pk.credentialId ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => void registerPasskey()}
        disabled={isRegistering || status.state === "loading"}
        className="btn-primary disabled:opacity-50"
      >
        {isRegistering ? "Follow the browser prompt…" : "Register a passkey"}
      </button>
    </div>
  );
}
