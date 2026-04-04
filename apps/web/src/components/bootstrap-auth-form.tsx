"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { DeviceLinkPanel } from "@/components/device-link-panel";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDateTime } from "@/lib/format";
import { suggestBrowserDeviceLabel } from "@/lib/onboarding";
import { RelayRequestError, startMagicLink } from "@/lib/relay";
import { authBootstrapEnabled } from "@/lib/site";

type BootstrapAuthMode = "signin" | "join";
type BootstrapEntryMethod = "magic-link" | "device-link";
type BootstrapField = "email" | "inviteToken" | "deviceLabel" | "ageConfirmed18";
type MagicLinkStep = 1 | 2;

const STORAGE_KEYS = {
  email: "emberchamber.auth.v1.email",
  inviteToken: "emberchamber.auth.v1.inviteToken",
  deviceLabel: "emberchamber.auth.v1.deviceLabel",
} as const;
const showDebugCompletionToken = process.env.NODE_ENV !== "production";

function readDraft(key: keyof typeof STORAGE_KEYS) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(STORAGE_KEYS[key]) ?? "";
}

function writeDraft(key: keyof typeof STORAGE_KEYS, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS[key], value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function BootstrapAuthForm({ mode }: { mode: BootstrapAuthMode }) {
  const [entryMethod, setEntryMethod] = useState<BootstrapEntryMethod>("magic-link");
  const [magicLinkStep, setMagicLinkStep] = useState<MagicLinkStep>(1);
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [deviceLabel, setDeviceLabel] = useState("Browser companion");
  const [ageConfirmed18, setAgeConfirmed18] = useState(false);
  const [challenge, setChallenge] = useState<{
    expiresAt: string;
    debugCompletionToken?: string;
  } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<BootstrapField, string>>>({});
  const [formMessage, setFormMessage] = useState<{
    tone: "error" | "success" | "warning";
    title: string;
    body: string;
  } | null>(null);
  const [inviteFieldVisible, setInviteFieldVisible] = useState(mode === "join");
  const [isReady, setIsReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);
  const inviteTokenRef = useRef<HTMLInputElement>(null);
  const deviceLabelRef = useRef<HTMLInputElement>(null);
  const ageConfirmed18Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEmail(readDraft("email"));
    setInviteToken(readDraft("inviteToken"));
    setDeviceLabel(readDraft("deviceLabel") || suggestBrowserDeviceLabel());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (entryMethod !== "magic-link" || magicLinkStep !== 2) {
      return;
    }

    window.setTimeout(() => deviceLabelRef.current?.focus(), 0);
  }, [entryMethod, magicLinkStep]);

  function focusField(field: BootstrapField) {
    if (field === "email") {
      emailRef.current?.focus();
      return;
    }

    if (field === "inviteToken") {
      inviteTokenRef.current?.focus();
      return;
    }

    if (field === "ageConfirmed18") {
      ageConfirmed18Ref.current?.focus();
      return;
    }

    deviceLabelRef.current?.focus();
  }

  function validateMagicLinkAccess(requireInviteToken: boolean) {
    const nextErrors: Partial<Record<BootstrapField, string>> = {};

    if (!email.trim()) {
      nextErrors.email = "Enter the email address that should receive the bootstrap link.";
    } else if (!isValidEmail(email.trim())) {
      nextErrors.email = "Enter a valid email address so the inbox step can complete.";
    }

    if (requireInviteToken) {
      if (!inviteToken.trim()) {
        nextErrors.inviteToken = "New beta accounts need an invite token before onboarding can begin.";
      } else if (inviteToken.trim().length < 4) {
        nextErrors.inviteToken = "This invite token is too short to be valid.";
      }
    }

    if (!ageConfirmed18) {
      nextErrors.ageConfirmed18 = "EmberChamber beta access is limited to adults 18 and over.";
    }

    setErrors((current) => ({
      ...current,
      email: nextErrors.email,
      inviteToken: nextErrors.inviteToken,
      ageConfirmed18: nextErrors.ageConfirmed18,
    }));

    const firstError = (["email", "inviteToken", "ageConfirmed18"] as const).find((field) => nextErrors[field]);
    if (firstError) {
      focusField(firstError);
      return false;
    }

    return true;
  }

  function validateDeviceLabel() {
    let nextError: string | undefined;

    if (!deviceLabel.trim()) {
      nextError = "Name this device so future session reviews stay readable.";
    } else if (deviceLabel.trim().length < 3) {
      nextError = "Use at least 3 characters so the device name is recognizable.";
    }

    setErrors((current) => ({
      ...current,
      deviceLabel: nextError,
    }));

    if (nextError) {
      focusField("deviceLabel");
      return false;
    }

    return true;
  }

  function moveToDeviceStep(requireInviteToken: boolean) {
    setChallenge(null);
    setFormMessage(null);

    if (!validateMagicLinkAccess(requireInviteToken)) {
      setFormMessage({
        tone: "error",
        title: "Fix the access details first",
        body:
          mode === "join"
            ? "Invite-only onboarding still needs a valid email, an adults-only confirmation, and the beta invite token when required."
            : "Sign-in still needs a valid email, an adults-only confirmation, and the invite token only when this address has never been used for beta access.",
      });
      return;
    }

    setMagicLinkStep(2);
    setFormMessage({
      tone: "success",
      title: "Access confirmed",
      body: "Give this browser a readable device name, then send the inbox link.",
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authBootstrapEnabled) {
      setFormMessage({
        tone: "warning",
        title: "Email bootstrap is not enabled here yet",
        body: "This deployment is up, but the production email channel still needs to be wired before onboarding can go live.",
      });
      toast.error(
        mode === "join"
          ? "Beta onboarding is not enabled on this deployment yet."
          : "Email sign-in is not enabled on this deployment yet.",
      );
      return;
    }

    const requireInviteToken = mode === "join" || inviteFieldVisible;
    if (magicLinkStep === 1) {
      moveToDeviceStep(requireInviteToken);
      return;
    }

    setChallenge(null);
    setFormMessage(null);

    const accessValid = validateMagicLinkAccess(requireInviteToken);
    const deviceValid = validateDeviceLabel();
    if (!accessValid || !deviceValid) {
      if (!accessValid) {
        setMagicLinkStep(1);
      }

      setFormMessage({
        tone: "error",
        title: "Fix the highlighted fields first",
        body:
          mode === "join"
            ? "Invite-only onboarding needs valid access details first, then a readable device name before the inbox link can be queued."
            : "Sign-in needs valid access details first, then a readable device name before the inbox link can be queued.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const trimmedInvite = inviteToken.trim();
        const nextChallenge = await startMagicLink({
          email: email.trim(),
          inviteToken: trimmedInvite ? trimmedInvite : undefined,
          deviceLabel: deviceLabel.trim(),
          ageConfirmed18: true,
        });

        writeDraft("email", email.trim());
        writeDraft("inviteToken", trimmedInvite);
        writeDraft("deviceLabel", deviceLabel.trim());

        setChallenge(nextChallenge);
        setErrors({});
        setFormMessage({
          tone: "success",
          title: "Check your inbox",
          body: `The current magic link expires ${formatUtcDateTime(nextChallenge.expiresAt)}.`,
        });
        toast.success(mode === "join" ? "Beta link queued" : "Magic link queued");
      } catch (error) {
        if (error instanceof RelayRequestError && error.code === "INVITE_REQUIRED") {
          setInviteFieldVisible(true);
          setMagicLinkStep(1);
          setErrors({
            inviteToken: "This email does not have a beta account yet. Add an invite token to continue.",
          });
          setFormMessage({
            tone: "warning",
            title: "Invite token required",
            body: "Returning users can sign in with email alone. New beta accounts still need an invite token for the first bootstrap.",
          });
          toast.error("Add an invite token to start a new beta account.");
          window.setTimeout(() => inviteTokenRef.current?.focus(), 0);
          return;
        }

        setFormMessage({
          tone: "error",
          title: mode === "join" ? "Unable to start beta onboarding" : "Unable to send the magic link",
          body:
            error instanceof Error
              ? error.message
              : mode === "join"
                ? "The request failed before the beta bootstrap email could be queued."
                : "The request failed before the sign-in email could be queued.",
        });
        toast.error(
          error instanceof Error
            ? error.message
            : mode === "join"
              ? "Unable to start beta onboarding"
              : "Unable to send magic link",
        );
      }
    });
  }

  const title =
    entryMethod === "device-link"
      ? "Link with another device"
      : mode === "join"
        ? "Join the invite-only beta"
        : "Continue with a private email";
  const subtitle =
    entryMethod === "device-link"
      ? "Use a readable device name, then either show a QR for a signed-in device to approve or scan a trusted device QR here."
      : mode === "join"
        ? "First confirm the invite path and adults-only gate, then name the device that should receive the inbox link."
        : "First confirm the email and adults-only gate, then name the browser that should receive the inbox link.";
  const requiresInviteToken = mode === "join" || inviteFieldVisible;

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
        <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>
      </div>

      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setEntryMethod("magic-link");
              setMagicLinkStep(1);
            }}
            className={`rounded-[1.2rem] border px-4 py-3 text-left transition-colors ${
              entryMethod === "magic-link"
                ? "border-brand-500 bg-brand-500/5"
                : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-brand-500/40"
            }`}
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">Magic link</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Use email bootstrap for the first device or whenever QR linking is unavailable.
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMethod("device-link");
              setMagicLinkStep(1);
            }}
            className={`rounded-[1.2rem] border px-4 py-3 text-left transition-colors ${
              entryMethod === "device-link"
                ? "border-brand-500 bg-brand-500/5"
                : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-brand-500/40"
            }`}
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">Link with QR</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
              Add this browser to an existing account after approval from a signed-in device.
            </p>
          </button>
        </div>

        {entryMethod === "magic-link" && !authBootstrapEnabled ? (
          <StatusCallout tone="warning" title="Closed beta bootstrap is not live here yet">
            This deployment is up, but the production email bootstrap path is still being wired.
          </StatusCallout>
        ) : null}

        <div className={`grid gap-2 ${entryMethod === "magic-link" ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {entryMethod === "magic-link" ? (
            <>
              <div
                className={`rounded-[1.2rem] border px-3 py-3 ${
                  magicLinkStep === 1
                    ? "border-brand-500 bg-brand-500/5"
                    : "border-[var(--border)] bg-[var(--bg-secondary)]"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Step 1</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {requiresInviteToken ? "Access details + 18+" : "Email + 18+"}
                </p>
              </div>
              <div
                className={`rounded-[1.2rem] border px-3 py-3 ${
                  magicLinkStep === 2
                    ? "border-brand-500 bg-brand-500/5"
                    : "border-[var(--border)] bg-[var(--bg-secondary)]"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Step 2</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Name device + send inbox link</p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Step 1</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Name device</p>
              </div>
              <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Step 2</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Show or scan QR</p>
              </div>
              <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">Step 3</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">Approve on trusted device</p>
              </div>
            </>
          )}
        </div>

        {entryMethod === "magic-link" ? (
          <>
            <form onSubmit={submit} className="space-y-4">
              {formMessage ? (
                <StatusCallout tone={formMessage.tone} title={formMessage.title}>
                  {formMessage.body}
                </StatusCallout>
              ) : null}

              {magicLinkStep === 1 ? (
                <>
                  <div>
                    <label
                      htmlFor={`${mode}-email`}
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Private email
                    </label>
                    <input
                      id={`${mode}-email`}
                      name="email"
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (errors.email) {
                          setErrors((current) => ({ ...current, email: undefined }));
                        }
                      }}
                      className="input"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      aria-invalid={errors.email ? "true" : "false"}
                      aria-describedby={errors.email ? `${mode}-email-error` : `${mode}-email-hint`}
                    />
                    <p id={`${mode}-email-hint`} className="mt-1 text-xs text-[var(--text-secondary)]">
                      Used only for bootstrap and recovery.
                    </p>
                    {errors.email ? (
                      <p id={`${mode}-email-error`} className="mt-1 text-sm text-red-500">
                        {errors.email}
                      </p>
                    ) : null}
                  </div>

                  {requiresInviteToken ? (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label
                          htmlFor={`${mode}-invite-token`}
                          className="block text-sm font-medium text-[var(--text-primary)]"
                        >
                          Invite token
                        </label>
                        {mode === "signin" ? (
                          <button
                            type="button"
                            className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 hover:text-brand-500"
                            onClick={() => {
                              setInviteFieldVisible(false);
                              setInviteToken("");
                              setErrors((current) => ({ ...current, inviteToken: undefined }));
                            }}
                          >
                            Hide
                          </button>
                        ) : null}
                      </div>
                      <input
                        id={`${mode}-invite-token`}
                        name="inviteToken"
                        ref={inviteTokenRef}
                        type="text"
                        value={inviteToken}
                        onChange={(event) => {
                          setInviteToken(event.target.value);
                          if (errors.inviteToken) {
                            setErrors((current) => ({ ...current, inviteToken: undefined }));
                          }
                        }}
                        className="input"
                        placeholder="Paste your beta invite token"
                        required={requiresInviteToken}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        aria-invalid={errors.inviteToken ? "true" : "false"}
                        aria-describedby={errors.inviteToken ? `${mode}-invite-token-error` : `${mode}-invite-token-hint`}
                      />
                      <p id={`${mode}-invite-token-hint`} className="mt-1 text-xs text-[var(--text-secondary)]">
                        Only needed when you are bootstrapping a new beta account.
                      </p>
                      {errors.inviteToken ? (
                        <p id={`${mode}-invite-token-error`} className="mt-1 text-sm text-red-500">
                          {errors.inviteToken}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text-primary)]">No invite token on hand?</p>
                      <p className="mt-1">
                        Returning users can continue with email alone. If this is your first device on a
                        new beta account, add the invite token now instead of starting over later.
                      </p>
                      <button
                        type="button"
                        className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-500"
                        onClick={() => {
                          setInviteFieldVisible(true);
                          window.setTimeout(() => inviteTokenRef.current?.focus(), 0);
                        }}
                      >
                        Add invite token
                      </button>
                    </div>
                  )}

                  <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
                    <label htmlFor={`${mode}-age-confirmed`} className="flex items-start gap-3">
                      <input
                        id={`${mode}-age-confirmed`}
                        name="ageConfirmed18"
                        ref={ageConfirmed18Ref}
                        type="checkbox"
                        checked={ageConfirmed18}
                        onChange={(event) => {
                          setAgeConfirmed18(event.target.checked);
                          if (errors.ageConfirmed18) {
                            setErrors((current) => ({ ...current, ageConfirmed18: undefined }));
                          }
                        }}
                        className="mt-1 h-4 w-4 rounded border-[var(--border)] text-brand-600"
                        aria-invalid={errors.ageConfirmed18 ? "true" : "false"}
                        aria-describedby={
                          errors.ageConfirmed18 ? `${mode}-age-confirmed-error` : `${mode}-age-confirmed-hint`
                        }
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">
                          I confirm I am at least 18 years old
                        </span>
                        <span
                          id={`${mode}-age-confirmed-hint`}
                          className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]"
                        >
                          EmberChamber beta access is adults-only. This is a self-attested gate, not identity verification.
                        </span>
                      </span>
                    </label>
                    {errors.ageConfirmed18 ? (
                      <p id={`${mode}-age-confirmed-error`} className="mt-2 text-sm text-red-500">
                        {errors.ageConfirmed18}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Access details confirmed</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                          Review the email and invite state below, or go back to edit them.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-sm font-semibold text-brand-600 hover:text-brand-500"
                        onClick={() => setMagicLinkStep(1)}
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Email</p>
                        <p className="mt-2 break-all text-sm font-medium text-[var(--text-primary)]">{email.trim()}</p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Invite</p>
                        <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                          {requiresInviteToken ? "Included" : "Not needed"}
                        </p>
                      </div>
                      <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Adults-only</p>
                        <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">Confirmed</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={`${mode}-device-label`}
                      className="block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Device label
                    </label>
                    <input
                      id={`${mode}-device-label`}
                      name="deviceLabel"
                      ref={deviceLabelRef}
                      type="text"
                      value={deviceLabel}
                      onChange={(event) => {
                        setDeviceLabel(event.target.value);
                        if (errors.deviceLabel) {
                          setErrors((current) => ({ ...current, deviceLabel: undefined }));
                        }
                      }}
                      className="input mt-1.5"
                      placeholder="Windows browser"
                      required
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={errors.deviceLabel ? "true" : "false"}
                      aria-describedby={errors.deviceLabel ? `${mode}-device-label-error` : `${mode}-device-label-hint`}
                    />
                    <p id={`${mode}-device-label-hint`} className="mt-1 text-xs text-[var(--text-secondary)]">
                      This name appears in session review, recovery prompts, and later device linking.
                    </p>
                    {errors.deviceLabel ? (
                      <p id={`${mode}-device-label-error`} className="mt-1 text-sm text-red-500">
                        {errors.deviceLabel}
                      </p>
                    ) : null}
                  </div>
                </>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {magicLinkStep === 2 ? (
                  <button type="button" className="btn-ghost sm:flex-1" onClick={() => setMagicLinkStep(1)}>
                    Back
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="btn-primary w-full py-3 sm:flex-1"
                  disabled={isPending || !authBootstrapEnabled || !isReady}
                >
                  {authBootstrapEnabled
                    ? isPending
                      ? mode === "join"
                        ? "Queuing magic link…"
                        : "Sending magic link…"
                      : magicLinkStep === 1
                        ? "Continue"
                        : mode === "join"
                          ? "Start beta onboarding"
                          : "Send magic link"
                    : "Email bootstrap coming soon"}
                </button>
              </div>
            </form>

            <StatusCallout tone="info" title="What happens next">
              1. Open the inbox for the email you entered here.
              <br />
              2. Confirm the link from the device you want to use first.
              <br />
              3. Finish profile setup with a pseudonymous name, then return later to review active devices and privacy settings.
            </StatusCallout>
          </>
        ) : (
          <div className="space-y-4">
            <StatusCallout tone="info" title="Existing account only">
              QR linking adds this browser to an account that already has a signed-in device. It does not replace invite-only account creation or email recovery for the first device.
            </StatusCallout>

            <div>
              <label
                htmlFor={`${mode}-qr-device-label`}
                className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
              >
                Device label
              </label>
              <input
                id={`${mode}-qr-device-label`}
                name="qrDeviceLabel"
                ref={deviceLabelRef}
                type="text"
                value={deviceLabel}
                onChange={(event) => {
                  setDeviceLabel(event.target.value);
                }}
                className="input"
                placeholder="Windows browser"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                This label is what the signed-in device will see before approval.
              </p>
            </div>

            <DeviceLinkPanel signedIn={false} deviceLabel={deviceLabel} />

            <StatusCallout tone="info" title="Fallback stays available">
              If the camera is unavailable, the QR expires, or this is your first device on a new account, switch back to the magic-link path above.
            </StatusCallout>
          </div>
        )}

        <StatusCallout tone="info" title="Trust boundary">
          Email is used only for bootstrap and recovery. It is never public, searchable, or used
          for discovery, and it is not your social identity inside the product.
        </StatusCallout>

        {challenge ? (
          <StatusCallout tone="success" title="Inbox check required">
            The link expires {formatUtcDateTime(challenge.expiresAt)}. Open it from the device you
            named above so the first session and device inventory stay readable.
            {showDebugCompletionToken && challenge.debugCompletionToken ? (
              <span className="mt-3 block break-all font-mono text-xs text-brand-500">
                Dev token: {challenge.debugCompletionToken}
              </span>
            ) : null}
          </StatusCallout>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        {mode === "join" ? (
          <>
            Already have access?{" "}
            <Link href="/login" className="font-medium text-brand-600 hover:underline">
              Request a sign-in link
            </Link>
          </>
        ) : (
          <>
            First device on a new account?{" "}
            <Link href="/register" className="font-medium text-brand-600 hover:underline">
              Start invite-only onboarding
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
