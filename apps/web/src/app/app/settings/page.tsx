"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { usersApi } from "@/lib/api";
import toast from "react-hot-toast";

interface Session {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  created_at: string;
  last_active_at: string;
  isCurrent: boolean;
}

type TabType = "profile" | "privacy" | "sessions" | "appearance";

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [profile, setProfile] = useState({ displayName: "", bio: "" });
  const [privacy, setPrivacy] = useState({
    showLastSeen: true,
    showReadReceipts: true,
    allowDmsFrom: "everyone" as "everyone" | "contacts" | "nobody",
    showOnlineStatus: true,
    profileVisible: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({ displayName: user.displayName ?? "", bio: user.bio ?? "" });
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "sessions") loadSessions();
    if (activeTab === "privacy") loadPrivacy();
  }, [activeTab]);

  async function loadSessions() {
    try {
      const data = await usersApi.getSessions();
      setSessions(data as Session[]);
    } catch { /* ignore */ }
  }

  async function loadPrivacy() {
    try {
      const data = await usersApi.getPrivacy();
      setPrivacy(data);
    } catch {
      // Keep defaults when the request fails.
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await usersApi.updateProfile({ displayName: profile.displayName, bio: profile.bio });
      updateUser({ displayName: profile.displayName, bio: profile.bio });
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function savePrivacy(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await usersApi.updatePrivacy(privacy);
      toast.success("Privacy settings updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      await usersApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
    }
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "privacy", label: "Privacy" },
    { id: "sessions", label: "Sessions" },
    { id: "appearance", label: "Appearance" },
  ];

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Settings</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-brand-500 border-b-2 border-brand-500"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-xl font-bold">
              {(user?.displayName ?? user?.username ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">{user?.displayName}</p>
              <p className="text-sm text-[var(--text-secondary)]">@{user?.username}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Display Name</label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
              className="input"
              maxLength={128}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              className="input resize-none"
              rows={3}
              maxLength={512}
              placeholder="Tell people a bit about yourself"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Email</label>
            <input type="email" value={user?.email ?? ""} className="input opacity-60" disabled />
            <p className="text-xs text-[var(--text-secondary)] mt-1">Email cannot be changed yet</p>
          </div>

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      {/* Privacy Tab */}
      {activeTab === "privacy" && (
        <form onSubmit={savePrivacy} className="space-y-4">
          <div className="card bg-brand-500/5 border-brand-500/20">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              Privacy controls
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Direct messages are private to participants, but this starter does
              not yet ship full end-to-end encryption. Invite-only communities
              and clear account-level controls are the current trust boundary.
            </p>
          </div>

          {[
            { key: "showLastSeen", label: "Show last seen time", description: "Let others see when you were last active" },
            { key: "showReadReceipts", label: "Send read receipts", description: "Let senders know when you've read their messages" },
            { key: "showOnlineStatus", label: "Show online status", description: "Let others see when you're online" },
            { key: "profileVisible", label: "Public profile", description: "Allow others to find and view your profile" },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPrivacy((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  privacy[key as keyof typeof privacy] ? "bg-brand-500" : "bg-[var(--border)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    privacy[key as keyof typeof privacy] ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Who can send you direct messages</label>
            <select
              value={privacy.allowDmsFrom}
              onChange={(e) => setPrivacy((p) => ({ ...p, allowDmsFrom: e.target.value as "everyone" | "contacts" | "nobody" }))}
              className="input"
            >
              <option value="everyone">Everyone</option>
              <option value="contacts">Contacts only</option>
              <option value="nobody">Nobody</option>
            </select>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Choose whether new direct-message requests can come from anyone,
              existing contacts, or no one.
            </p>
          </div>

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Privacy Settings"}
          </button>
        </form>
      )}

      {/* Sessions Tab */}
      {activeTab === "sessions" && (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            These are all the devices that are currently logged in to your account.
          </p>
          {sessions.map((session) => (
            <div key={session.id} className="card flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {session.device_name}
                  </span>
                  {session.isCurrent && (
                    <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {session.ip_address} · Last active {new Date(session.last_active_at).toLocaleDateString()}
                </p>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => revokeSession(session.id)}
                  className="text-sm text-red-400 hover:text-red-500"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-center text-[var(--text-secondary)] py-8">No active sessions found</p>
          )}
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Theme</p>
            <div className="flex gap-3">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    const resolvedTheme = t === "system"
                      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                      : t;
                    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
                    localStorage.setItem("theme", t === "system" ? resolvedTheme : t);
                  }}
                  className="card flex-1 text-center py-3 cursor-pointer hover:border-brand-500 transition-colors capitalize"
                >
                  {t === "light" ? "☀️" : t === "dark" ? "🌙" : "💻"} {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
