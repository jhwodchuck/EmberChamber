"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Tabs } from "@emberchamber/ui/components";
import { relayAccountApi } from "@/lib/relay";
import { useAuthStore } from "@/lib/store";
import { AppearanceSection } from "./_sections/AppearanceSection";
import { PasskeysSection } from "./_sections/PasskeysSection";
import { PrivacySection } from "./_sections/PrivacySection";
import { ProfileSection } from "./_sections/ProfileSection";
import { SessionsSection, type Session } from "./_sections/SessionsSection";

type TabType = "profile" | "privacy" | "sessions" | "security" | "appearance";
type LoadStatus = "idle" | "loading" | "ready" | "error";

const tabs: { id: TabType; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "privacy", label: "Privacy" },
  { id: "sessions", label: "Sessions" },
  { id: "security", label: "Security" },
  { id: "appearance", label: "Appearance" },
] as const;

type PrivacyState = {
  notificationPreviewMode: "discreet" | "expanded" | "none";
  autoDownloadSensitiveMedia: boolean;
  allowSensitiveExport: boolean;
  secureAppSwitcher: boolean;
  oledDark: boolean;
};

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [oledEnabled, setOledEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState({ displayName: "", bio: "" });
  const [privacy, setPrivacy] = useState<PrivacyState>({
    notificationPreviewMode: "discreet",
    autoDownloadSensitiveMedia: false,
    allowSensitiveExport: false,
    secureAppSwitcher: true,
    oledDark: false,
  });
  const [sessionsStatus, setSessionsStatus] = useState<{
    state: LoadStatus;
    message?: string;
  }>({ state: "idle" });
  const [privacyStatus, setPrivacyStatus] = useState<{
    state: LoadStatus;
    message?: string;
  }>({ state: "idle" });
  const [revokedSessionNotice, setRevokedSessionNotice] = useState<{
    deviceLabel: string;
  } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfile({ displayName: user.displayName ?? "", bio: user.bio ?? "" });
    }
  }, [user]);

  useEffect(() => {
    setOledEnabled(
      typeof window !== "undefined" && localStorage.getItem("oled") === "true",
    );
  }, []);

  useEffect(() => {
    if (activeTab === "sessions") void loadSessions();
    if (activeTab === "privacy") void loadPrivacy();
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
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
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
      toast.error(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6">
      <h2 className="mb-6 text-xl font-bold text-[var(--text-primary)]">
        Settings
      </h2>

      <div className="mb-6">
        <Tabs
          tabs={tabs.map((t) => ({ value: t.id, label: t.label }))}
          value={activeTab}
          onChange={(v) => setActiveTab(v as typeof activeTab)}
        />
      </div>

      {activeTab === "profile" ? (
        <ProfileSection
          user={user}
          profile={profile}
          setProfile={setProfile}
          isSavingProfile={isSavingProfile}
          onSubmit={(e) => void saveProfile(e)}
        />
      ) : null}

      {activeTab === "privacy" ? (
        <PrivacySection
          privacy={privacy}
          setPrivacy={setPrivacy}
          privacyStatus={privacyStatus}
          isSavingPrivacy={isSavingPrivacy}
          onRetry={() => void loadPrivacy()}
          onSubmit={(e) => void savePrivacy(e)}
        />
      ) : null}

      {activeTab === "sessions" ? (
        <SessionsSection
          sessions={sessions}
          sessionsStatus={sessionsStatus}
          revokedSessionNotice={revokedSessionNotice}
          revokingSessionId={revokingSessionId}
          onRefresh={() => void loadSessions()}
          onRevoke={(id) => void revokeSession(id)}
        />
      ) : null}

      {activeTab === "security" ? <PasskeysSection /> : null}

      {activeTab === "appearance" ? (
        <AppearanceSection
          oledEnabled={oledEnabled}
          setOledEnabled={setOledEnabled}
        />
      ) : null}
    </div>
  );
}
