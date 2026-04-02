"use client";

import { Compass, Hash, LogOut, MessageSquare, PlusSquare, Search, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { Avatar } from "@/components/avatar";
import { StatusCallout } from "@/components/status-callout";
import { readRelaySession } from "@/lib/relay";
import { useAuthStore } from "@/lib/store";

type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  message?: string;
};

type CompanionShellContextValue = {
  conversations: Array<{
    id: string;
    type: "dm" | "group";
    name?: string;
    avatarUrl?: string | null;
    updatedAt: string;
    unreadCount: number;
    lastMessage?: { content?: string | null } | null;
  }>;
  channels: Array<{
    id: string;
    name: string;
    description?: string | null;
    member_count: number;
  }>;
  conversationsState: LoadState;
  channelsState: LoadState;
  isConnected: boolean;
  userName: string;
  refreshShellData: () => Promise<void>;
};

const CompanionShellContext = createContext<CompanionShellContextValue | null>(null);

const primaryLinks = [
  { href: "/app", label: "Overview", icon: Compass },
  { href: "/app/new-dm", label: "New Message", icon: MessageSquare },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/new-group", label: "New Group", icon: PlusSquare },
  { href: "/app/new-channel", label: "New Channel", icon: Hash },
  { href: "/app/discover", label: "Join with Invite", icon: ShieldCheck },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

const emptyState: CompanionShellContextValue = {
  conversations: [],
  channels: [],
  conversationsState: { status: "ready" },
  channelsState: { status: "ready" },
  isConnected: false,
  userName: "Web user",
  refreshShellData: async () => undefined,
};

export function useCompanionShell() {
  const context = useContext(CompanionShellContext);

  if (!context) {
    throw new Error("useCompanionShell must be used within CompanionShell");
  }

  return context;
}

export function CompanionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const loadUser = useAuthStore((state) => state.loadUser);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isLoadingUser = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const session = readRelaySession();
    setHasSession(!!session?.accessToken);

    if (session?.accessToken) {
      void loadUser();
    }
  }, [loadUser]);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await logout();
      router.push("/login");
    } finally {
      setIsSigningOut(false);
      setHasSession(false);
    }
  }

  const contextValue: CompanionShellContextValue = {
    ...emptyState,
    userName: user?.displayName ?? user?.username ?? "Web user",
  };

  if (hasSession === null || (hasSession && isLoadingUser)) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-6 py-12">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-12">
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <span>Loading your web workspace…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-6 py-12">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-8 shadow-[0_16px_48px_rgba(32,19,18,0.08)]">
          <div className="eyebrow">Web Access</div>
          <h1 className="mt-5 text-balance font-display text-5xl font-semibold text-[var(--text-primary)] sm:text-6xl">
            Confirm the email link before using the web app.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
            The browser supports messaging, invites, recovery, and settings. Android and desktop
            remain the preferred surfaces for always-on use and heavier media traffic.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link href="/login" className="card transition-colors hover:border-brand-500">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Request Magic Link</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Sign in from the private inbox that already has beta access.
              </p>
            </Link>
            <Link href="/register" className="card transition-colors hover:border-brand-500">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Join the Beta</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Use invite-only onboarding for a new beta account.
              </p>
            </Link>
            <Link href="/support" className="card transition-colors hover:border-brand-500">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Get Support</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Open the support guide if the inbox or redirect flow looks wrong.
              </p>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CompanionShellContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <header className="border-b border-[var(--border)] bg-[color:var(--bg-overlay)]/85 px-6 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Web Workspace</p>
              <h1 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                EmberChamber web app
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-[var(--text-primary)]">{contextValue.userName}</p>
                <p className="text-xs text-[var(--text-secondary)]">Signed in relay session</p>
              </div>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="btn-ghost"
                disabled={isSigningOut}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {isSigningOut ? "Signing Out…" : "Sign Out"}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="panel p-5">
              <div className="flex items-center gap-3">
                <Avatar name={contextValue.userName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {contextValue.userName}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Messaging, invites, settings, and account recovery
                  </p>
                </div>
              </div>

              <nav className="mt-5 space-y-1" aria-label="Workspace navigation">
                {primaryLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || (item.href !== "/app" && pathname.startsWith(`${item.href}/`));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-500/10 text-brand-600"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                Surface Split
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <p>The web app supports real messaging, search, invite review, and channel posting.</p>
                <p>Android and desktop stay preferred for primary daily use and heavier media traffic.</p>
                <p>Use whichever surface fits the moment without pretending they must all be equal.</p>
              </div>
            </div>

            <StatusCallout tone="info" title="What this workspace is for">
              Use web when it is the fastest or lightest way to message, search, review invites,
              or manage settings. Shift sustained heavier usage to native when capacity and device
              affordances matter more.
            </StatusCallout>
          </aside>

          <main id="main-content" className="min-w-0">
            <div className="min-h-[640px] rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_16px_48px_rgba(32,19,18,0.08)]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </CompanionShellContext.Provider>
  );
}
