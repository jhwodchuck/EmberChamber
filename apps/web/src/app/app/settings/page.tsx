"use client";

import * as Switch from "@radix-ui/react-switch";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { DeviceLinkPanel } from "@/components/device-link-panel";
import { StatusCallout } from "@/components/status-callout";
import { formatUtcDate } from "@/lib/format";
import { relayAccountApi } from "@/lib/relay";
import { useAuthStore } from "@/lib/store";

interface Session {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}

type TabType = "profile" | "privacy" | "sessions" | "appearance";
type LoadStatus = "idle" | "loading" | "ready" | "error";

const tabs: { id: TabType; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "privacy", label: "Privacy" },
  { id: "sessions", label: "Sessions" },
  { id: "appearance", label: "Appearance" },
] as const;

const privacyToggleFields = [
  {
    key: "autoDownloadSensitiveMedia",
    label: "Auto-download sensitive media",
    description:
      "Leave this off unless you want private media cached automatically on this device.",
  },
  {
    key: "allowSensitiveExport",
    label: "Allow sensitive export",
    description:
      "Keep this off to discourage saving intimate media outside the app vault.",
  },
  {
    key: "secureAppSwitcher",
    label: "Secure app switcher",
    description:
      "Request secure-window behavior on supported devices to reduce snapshot leakage.",
  },
] as const;

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState({ displayName: "", bio: "" });
  const [privacy, setPrivacy] = useState({
    notificationPreviewMode: "discreet" as "discreet" | "expanded" | "none",
    autoDownloadSensitiveMedia: false,
    allowSensitiveExport: false,
    secureAppSwitcher: true,
  });
  const [sessionsStatus, setSessionsStatus] = useState<{
    state: LoadStatus;
    message?: string;
  }>({
    state: "idle",
  });
  const [privacyStatus, setPrivacyStatus] = useState<{
    state: LoadStatus;
    message?: string;
  }>({
    state: "idle",
  });
  const [revokedSessionNotice, setRevokedSessionNotice] = useState<{
    deviceLabel: string;
  } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (user) {
      setProfile({ displayName: user.displayName ?? "", bio: user.bio ?? "" });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "sessions") {
      void loadSessions();
    }

    if (activeTab === "privacy") {
      void loadPrivacy();
    }
  }, [activeTab]);

  async function loadSessions() {
    setSessionsStatus({ state: "loading" });

    try {
      setSessions(await relayAccountApi.listSessions());
      setSessionsStatus({ state: "ready" });
    } catch (err: unknown) {
      setSessionsStatus({
        state: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to load active sessions. Retry to confirm which devices still have access.",
      });
    }
  }

  async function loadPrivacy() {
    setPrivacyStatus({ state: "loading" });

    try {
      setPrivacy(await relayAccountApi.getPrivacy());
      setPrivacyStatus({ state: "ready" });
    } catch (err: unknown) {
      setPrivacyStatus({
        state: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to load your current privacy settings. Retry before saving changes.",
      });
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      await relayAccountApi.updateProfile({
        displayName: profile.displayName,
        bio: profile.bio,
      });
      updateUser({ displayName: profile.displayName, bio: profile.bio });
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePrivacy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (privacyStatus.state !== "ready") {
      toast.error("Reload privacy settings before saving changes");
      return;
    }

    setIsSavingPrivacy(true);

    try {
      await relayAccountApi.updatePrivacy(privacy);
      toast.success("Privacy settings updated");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save privacy settings",
      );
    } finally {
      setIsSavingPrivacy(false);
    }
  }

  async function revokeSession(sessionId: string) {
    const targetSession = sessions.find((session) => session.id === sessionId);
    const targetLabel = targetSession?.deviceLabel ?? "This device";
    if (
      !window.confirm(
        `Revoke the session for ${targetLabel}? That device will lose this sign-in and must request a new magic link to get back in.`,
      )
    ) {
      return;
    }

    setRevokingSessionId(sessionId);

    try {
      await relayAccountApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      setRevokedSessionNotice({ deviceLabel: targetLabel });
      toast.success("Session access removed");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke session",
      );
    } finally {
      setRevokingSessionId(null);
    }
  }

  const privacyControlsDisabled =
    privacyStatus.state !== "ready" || isSavingPrivacy;

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6">
      <h2 className="mb-6 text-xl font-bold text-[var(--text-primary)]">
        Settings
      </h2>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="mb-6 flex gap-1 border-b border-[var(--border)]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`settings-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" ? (
        <form
          id="settings-panel-profile"
          role="tabpanel"
          aria-labelledby="settings-tab-profile"
          onSubmit={saveProfile}
          className="space-y-4"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
              {(user?.displayName ?? user?.username ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {user?.displayName || "Unnamed user"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                @{user?.username}
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-display-name"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Display Name
            </label>
            <input
              id="settings-display-name"
              name="displayName"
              type="text"
              value={profile.displayName}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              className="input"
              maxLength={128}
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="settings-bio"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Private bio
            </label>
            <textarea
              id="settings-bio"
              name="bio"
              value={profile.bio}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              className="input resize-none"
              rows={3}
              maxLength={512}
              placeholder="Optional profile note for trusted circles…"
            />
          </div>

          <div>
            <label
              htmlFor="settings-email"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              value={user?.email ?? ""}
              className="input opacity-60"
              disabled
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Email stays tied to bootstrap and recovery. Changes are not
              available in beta.
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isSavingProfile}
          >
            {isSavingProfile ? "Saving Profile…" : "Save Profile"}
          </button>
        </form>
      ) : null}

      {activeTab === "privacy" ? (
        <form
          id="settings-panel-privacy"
          role="tabpanel"
          aria-labelledby="settings-tab-privacy"
          onSubmit={savePrivacy}
          className="space-y-4"
        >
          <div className="card border-brand-500/20 bg-brand-500/5">
            <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
              Sensitive-media defaults
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              The beta assumes intimate media should stay discreet by default.
              These controls bias toward in-app viewing, private vault storage,
              and less visible device behavior.
            </p>
          </div>

          {privacyStatus.state === "loading" ? (
            <StatusCallout tone="info" title="Loading current privacy settings">
              The relay is refreshing your current defaults before you make
              changes.
            </StatusCallout>
          ) : null}

          {privacyStatus.state === "error" ? (
            <StatusCallout
              tone="error"
              title="Privacy settings did not load"
              action={
                <button
                  type="button"
                  onClick={() => void loadPrivacy()}
                  className="btn-ghost"
                >
                  Retry
                </button>
              }
            >
              {privacyStatus.message}
            </StatusCallout>
          ) : null}

          <div>
            <label
              htmlFor="settings-preview-mode"
              className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
            >
              Notification preview mode
            </label>
            <select
              id="settings-preview-mode"
              value={privacy.notificationPreviewMode}
              onChange={(event) =>
                setPrivacy((current) => ({
                  ...current,
                  notificationPreviewMode: event.target.value as
                    | "discreet"
                    | "expanded"
                    | "none",
                }))
              }
              className="input"
              disabled={privacyControlsDisabled}
            >
              <option value="discreet">Discreet</option>
              <option value="expanded">Expanded</option>
              <option value="none">No previews</option>
            </select>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Keep lock-screen and banner previews minimal by default.
            </p>
          </div>

          {privacyToggleFields.map(({ key, label, description }) => {
            const labelId = `privacy-${key}-label`;
            const descriptionId = `privacy-${key}-description`;

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div className="min-w-0">
                  <p
                    id={labelId}
                    className="text-sm font-medium text-[var(--text-primary)]"
                  >
                    {label}
                  </p>
                  <p
                    id={descriptionId}
                    className="text-xs text-[var(--text-secondary)]"
                  >
                    {description}
                  </p>
                </div>

                <Switch.Root
                  checked={privacy[key]}
                  onCheckedChange={(checked) =>
                    setPrivacy((current) => ({ ...current, [key]: checked }))
                  }
                  aria-labelledby={labelId}
                  aria-describedby={descriptionId}
                  disabled={privacyControlsDisabled}
                  className={clsx(
                    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                    privacy[key]
                      ? "border-brand-500 bg-brand-500"
                      : "border-[var(--border)] bg-[var(--bg-secondary)]",
                    privacyControlsDisabled && "opacity-60",
                  )}
                >
                  <Switch.Thumb
                    className={clsx(
                      "block h-4 w-4 rounded-full bg-white transition-transform",
                      privacy[key] ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </Switch.Root>
              </div>
            );
          })}

          <button
            type="submit"
            className="btn-primary"
            disabled={privacyControlsDisabled}
          >
            {isSavingPrivacy ? "Saving Privacy…" : "Save Privacy Settings"}
          </button>
        </form>
      ) : null}

      {activeTab === "sessions" ? (
        <div
          id="settings-panel-sessions"
          role="tabpanel"
          aria-labelledby="settings-tab-sessions"
          className="space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              These are the devices that still have a valid relay session for
              your account.
            </p>
            <button
              type="button"
              onClick={() => void loadSessions()}
              className="btn-ghost shrink-0"
            >
              Refresh
            </button>
          </div>

          <DeviceLinkPanel signedIn className="space-y-4" />

          {revokedSessionNotice ? (
            <StatusCallout tone="success" title="Session revoked">
              {revokedSessionNotice.deviceLabel} lost this sign-in. That device
              must request a new magic link before it can get back into the
              account.
            </StatusCallout>
          ) : null}

          {sessionsStatus.state === "loading" ? (
            <StatusCallout tone="info" title="Loading active sessions">
              The relay is checking which devices still have access.
            </StatusCallout>
          ) : null}

          {sessionsStatus.state === "error" ? (
            <StatusCallout
              tone="error"
              title="Sessions did not load"
              action={
                <button
                  type="button"
                  onClick={() => void loadSessions()}
                  className="btn-ghost"
                >
                  Retry
                </button>
              }
            >
              {sessionsStatus.message}
            </StatusCallout>
          ) : null}

          {sessionsStatus.state === "ready" && sessions.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-secondary)]">
              No active sessions found.
            </p>
          ) : null}

          {sessionsStatus.state === "ready"
            ? sessions.map((session) => (
                <div
                  key={session.id}
                  className="card flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {session.deviceLabel}
                      </span>
                      {session.isCurrent ? (
                        <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-xs text-green-500">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Created {formatUtcDate(session.createdAt)} UTC · Last seen{" "}
                      {formatUtcDate(session.lastSeenAt)} UTC
                    </p>
                  </div>

                  {!session.isCurrent ? (
                    <button
                      type="button"
                      onClick={() => void revokeSession(session.id)}
                      className="text-sm text-red-400 hover:text-red-500 disabled:opacity-50"
                      disabled={revokingSessionId === session.id}
                      aria-label={`Revoke session for ${session.deviceLabel}`}
                    >
                      {revokingSessionId === session.id
                        ? "Revoking…"
                        : "Revoke"}
                    </button>
                  ) : null}
                </div>
              ))
            : null}
        </div>
      ) : null}

      {activeTab === "appearance" ? (
        <div
          id="settings-panel-appearance"
          role="tabpanel"
          aria-labelledby="settings-tab-appearance"
          className="space-y-4"
        >
          <StatusCallout tone="info" title="Browser-only theme setting">
            This appearance control only affects the current web surface.
          </StatusCallout>

          <div>
            <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
              Theme
            </p>
            <div className="flex gap-3">
              {(["light", "dark", "system"] as const).map((themeOption) => (
                <button
                  key={themeOption}
                  type="button"
                  onClick={() => {
                    const prefersDark = window.matchMedia(
                      "(prefers-color-scheme: dark)",
                    ).matches;
                    const resolvedTheme =
                      themeOption === "system"
                        ? prefersDark
                          ? "dark"
                          : "light"
                        : themeOption;

                    document.documentElement.classList.toggle(
                      "dark",
                      resolvedTheme === "dark",
                    );
                    localStorage.setItem("theme", themeOption);
                  }}
                  className="card flex-1 cursor-pointer py-3 text-center capitalize transition-colors hover:border-brand-500"
                >
                  {themeOption === "light"
                    ? "Light"
                    : themeOption === "dark"
                      ? "Dark"
                      : "System"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
