"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { conversationsApi, channelsApi } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import toast from "react-hot-toast";
import { clsx } from "clsx";

interface Conversation {
  id: string;
  type: string;
  name?: string;
  avatarUrl?: string;
  lastMessage?: { content?: string; created_at: string };
  unreadCount?: number;
  dmUser?: { id: string; username: string; display_name: string; avatar_url?: string };
}

interface Channel {
  id: string;
  name: string;
  visibility: string;
  member_count?: number;
}

function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={clsx(sizeClasses[size], "rounded-full object-cover flex-shrink-0")}
      />
    );
  }

  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-red-500",
    "bg-orange-500",
    "bg-teal-500",
  ];
  const colorIdx =
    name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={clsx(
        sizeClasses[size],
        colors[colorIdx],
        "rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
      )}
    >
      {initials}
    </div>
  );
}

export { Avatar };

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeTab, setActiveTab] = useState<"chats" | "channels">("chats");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const { isConnected } = useWebSocket({
    onMessage: (event: unknown) => {
      const msg = event as { type: string; payload: unknown };
      if (msg.type === "message.new") {
        // Refresh conversation list to update last message
        loadConversations();
      }
    },
  });

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Apply theme
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme ?? (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
      loadChannels();
    }
  }, [isAuthenticated]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  async function loadConversations() {
    try {
      const data = await conversationsApi.list();
      setConversations(data as Conversation[]);
    } catch {
      // silent
    }
  }

  async function loadChannels() {
    try {
      const data = await channelsApi.myChannels();
      setChannels(data as Channel[]);
    } catch {
      // silent
    }
  }

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
    router.push("/");
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border)]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <span className="font-bold text-[var(--text-primary)]">
                PrivateMesh
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="btn-ghost p-1.5 rounded-lg"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <div
                className={clsx(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-400" : "bg-gray-400"
                )}
                title={isConnected ? "Connected" : "Disconnected"}
              />
            </div>
          </div>

          {/* Search */}
          <Link href="/app/search">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm cursor-pointer hover:bg-[var(--border)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search...
            </div>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab("chats")}
            className={clsx(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "chats"
                ? "text-brand-500 border-b-2 border-brand-500"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab("channels")}
            className={clsx(
              "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "channels"
                ? "text-brand-500 border-b-2 border-brand-500"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Channels
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "chats" && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Direct Messages
                </span>
                <Link href="/app/new-dm" className="btn-ghost p-1 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
              </div>

              {conversations.filter((c) => c.type === "dm").map((conv) => (
                <Link
                  key={conv.id}
                  href={`/app/chat/${conv.id}`}
                  className="sidebar-item"
                >
                  <Avatar
                    src={conv.dmUser?.avatar_url}
                    name={conv.name ?? conv.dmUser?.display_name ?? "User"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {conv.name ?? conv.dmUser?.display_name ?? "User"}
                      </span>
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="bg-brand-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {conv.lastMessage?.content ?? "No messages yet"}
                    </p>
                  </div>
                </Link>
              ))}

              <div className="flex items-center justify-between px-2 py-1.5 mt-3 mb-1">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Groups
                </span>
                <Link href="/app/new-group" className="btn-ghost p-1 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
              </div>

              {conversations.filter((c) => c.type === "group").map((conv) => (
                <Link
                  key={conv.id}
                  href={`/app/chat/${conv.id}`}
                  className="sidebar-item"
                >
                  <Avatar
                    src={conv.avatarUrl}
                    name={conv.name ?? "Group"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {conv.name ?? "Group"}
                      </span>
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="bg-brand-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {conv.lastMessage?.content ?? "No messages yet"}
                    </p>
                  </div>
                </Link>
              ))}

              {conversations.length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  <p>No conversations yet</p>
                  <Link href="/app/new-dm" className="text-brand-500 hover:underline mt-1 block">
                    Start a conversation
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "channels" && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  My Channels
                </span>
                <Link href="/app/new-channel" className="btn-ghost p-1 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
              </div>

              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/app/channel/${channel.id}`}
                  className="sidebar-item"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    #
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate block">
                      {channel.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {channel.member_count ?? 0} members
                    </span>
                  </div>
                </Link>
              ))}

              <div className="px-2 mt-3">
                <Link href="/app/discover" className="btn-ghost w-full text-sm py-2">
                  🔍 Discover channels
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User footer */}
        <div className="border-t border-[var(--border)] p-3 flex items-center gap-3">
          <Avatar
            src={user?.avatarUrl}
            name={user?.displayName ?? user?.username ?? "?"}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {user?.displayName ?? user?.username}
            </p>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              @{user?.username}
            </p>
          </div>
          <div className="flex gap-1">
            <Link href="/app/settings" className="btn-ghost p-1.5 rounded-lg" title="Settings">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <button onClick={handleLogout} className="btn-ghost p-1.5 rounded-lg" title="Sign out">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
