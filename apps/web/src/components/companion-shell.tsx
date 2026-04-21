"use client";

import type { CipherEnvelope } from "@emberchamber/protocol";
import {
  Compass,
  LogOut,
  MessageSquare,
  PlusSquare,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clsx } from "clsx";
import { Avatar } from "@/components/avatar";
import { ChatRail } from "@/components/chat-rail";
import {
  createConversationPreference,
  estimateConversationUnreadCount,
  readConversationPreferences,
  updateConversationPreferenceMap,
  writeConversationPreferences,
  type ConversationPreference,
} from "@/lib/conversation-preferences";
import {
  createRelayMailboxWebSocket,
  ensureRelayAccessToken,
  readRelaySession,
  relayConversationApi,
} from "@/lib/relay";
import { conversationHref } from "@/lib/conversation-routes";
import {
  ensureWorkspaceReady,
  getConversationPreviews,
  ingestRelayEnvelopes,
  listStoredConversationMessages,
} from "@/lib/relay-workspace";
import { authBootstrapEnabled, publicSignInCta } from "@/lib/site";
import { useAuthStore } from "@/lib/store";
import { calcReconnectDelayMs } from "@/lib/backoff";

type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  message?: string;
};

type CompanionShellContextValue = {
  conversations: Array<{
    id: string;
    type: "dm" | "group" | "community" | "room";
    name?: string;
    href: string;
    avatarUrl?: string | null;
    updatedAt: string;
    unreadCount: number;
    memberCount: number;
    historyMode: "relay_hosted" | "device_encrypted";
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
  mailboxRevision: number;
  userName: string;
  refreshShellData: () => Promise<void>;
};

type MailboxLiveEvent =
  | {
      type: "ready";
      lastQueuedEnvelopeId?: string;
    }
  | {
      type: "envelope";
      envelope: CipherEnvelope;
    };

const CompanionShellContext = createContext<CompanionShellContextValue | null>(null);

const primaryLinks = [
  { href: "/app", label: "Overview", icon: Compass },
  { href: "/app/new-dm", label: "New DM", icon: MessageSquare },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/new-group", label: "New Group", icon: PlusSquare },
  { href: "/app/new-community", label: "New Community", icon: PlusSquare },
  { href: "/app/discover", label: "Review Invite", icon: ShieldCheck },
  { href: "/app/settings", label: "Settings", icon: Settings },
] as const;

const emptyState: CompanionShellContextValue = {
  conversations: [],
  channels: [],
  conversationsState: { status: "ready" },
  channelsState: { status: "ready" },
  isConnected: false,
  mailboxRevision: 0,
  userName: "Web user",
  refreshShellData: async () => undefined,
};

function getActiveConversationId(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app") {
    return null;
  }

  if (
    (segments[1] === "chat" || segments[1] === "community") &&
    segments[2]
  ) {
    return segments[2];
  }

  return null;
}

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
  const [conversations, setConversations] = useState<CompanionShellContextValue["conversations"]>([]);
  const [conversationsState, setConversationsState] = useState<LoadState>({ status: "idle" });
  const [conversationPreferences, setConversationPreferences] = useState<
    Record<string, ConversationPreference>
  >({});
  const [isConnected, setIsConnected] = useState(false);
  const [mailboxRevision, setMailboxRevision] = useState(0);
  const mailboxReconnectTimerRef = useRef<number | null>(null);
  const mailboxReconnectAttemptRef = useRef(0);
  const loadUser = useAuthStore((state) => state.loadUser);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isLoadingUser = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const activeConversationId = getActiveConversationId(pathname);

  useEffect(() => {
    const session = readRelaySession();
    setHasSession(!!session?.accessToken);

    if (session?.accessToken) {
      void loadUser();
    }
  }, [loadUser]);

  useEffect(() => {
    setConversationPreferences(readConversationPreferences(user?.id));
  }, [user?.id]);

  const refreshShellData = useCallback(
    async (options: { syncWorkspace?: boolean } = {}) => {
      const { syncWorkspace = true } = options;
      setConversationsState({ status: "loading" });

      try {
        if (syncWorkspace) {
          await ensureWorkspaceReady();
        }

        const nextConversations = await relayConversationApi.list();
        const storedPreferences = readConversationPreferences(user?.id);
        const previews = await getConversationPreviews(
          nextConversations.map((conversation) => conversation.id),
        );
        const storedMessagesByConversation = Object.fromEntries(
          await Promise.all(
            nextConversations.map(async (conversation) => [
              conversation.id,
              conversation.historyMode === "device_encrypted"
                ? await listStoredConversationMessages(conversation.id)
                : [],
            ]),
          ),
        );

        startTransition(() => {
          setConversationPreferences(storedPreferences);
          setConversations(
            nextConversations.map((conversation) => {
              const preview = previews[conversation.id];
              const preference =
                storedPreferences[conversation.id] ??
                createConversationPreference(conversation.id);
              return {
                id: conversation.id,
                type:
                  conversation.kind === "direct_message"
                    ? "dm"
                    : conversation.kind === "community"
                      ? "community"
                      : conversation.kind === "room"
                        ? "room"
                        : "group",
                name: conversation.title,
                href: conversationHref({
                  id: conversation.id,
                  kind: conversation.kind,
                }),
                avatarUrl: null,
                updatedAt: conversation.lastMessageAt ?? conversation.updatedAt,
                unreadCount: estimateConversationUnreadCount({
                  accountId: user?.id,
                  conversation,
                  preference,
                  storedMessages: storedMessagesByConversation[conversation.id],
                }),
                memberCount: conversation.memberCount,
                historyMode: conversation.historyMode,
                lastMessage: preview?.text
                  ? { content: preview.text }
                  : preview?.attachment
                    ? { content: preview.attachment.fileName }
                    : null,
              };
            }),
          );
          setConversationsState({ status: "ready" });
        });
      } catch (error) {
        setConversationsState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load relay conversations.",
        });
      }
    },
    [user?.id],
  );

  const commitConversationPreferences = useCallback(
    (
      updater: (
        current: Record<string, ConversationPreference>,
      ) => Record<string, ConversationPreference>,
    ) => {
      setConversationPreferences((current) => {
        const next = updater(current);
        writeConversationPreferences(user?.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      commitConversationPreferences((current) =>
        updateConversationPreferenceMap(current, conversationId, {
          lastReadAt: new Date().toISOString(),
        }),
      );
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    },
    [commitConversationPreferences],
  );

  const toggleConversationPinned = useCallback(
    (conversationId: string) => {
      commitConversationPreferences((current) => {
        const currentPreference =
          current[conversationId] ?? createConversationPreference(conversationId);
        return updateConversationPreferenceMap(current, conversationId, {
          isPinned: !currentPreference.isPinned,
        });
      });
    },
    [commitConversationPreferences],
  );

  const toggleConversationMuted = useCallback(
    (conversationId: string) => {
      commitConversationPreferences((current) => {
        const currentPreference =
          current[conversationId] ?? createConversationPreference(conversationId);
        return updateConversationPreferenceMap(current, conversationId, {
          isMuted: !currentPreference.isMuted,
        });
      });
    },
    [commitConversationPreferences],
  );

  const toggleConversationArchived = useCallback(
    (conversationId: string) => {
      commitConversationPreferences((current) => {
        const currentPreference =
          current[conversationId] ?? createConversationPreference(conversationId);
        return updateConversationPreferenceMap(current, conversationId, {
          isArchived: !currentPreference.isArchived,
        });
      });
    },
    [commitConversationPreferences],
  );

  useEffect(() => {
    if (!hasSession || !isAuthenticated || !user?.id) {
      return;
    }

    void refreshShellData();
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        void refreshShellData();
      }
    };
    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [hasSession, isAuthenticated, refreshShellData, user?.id]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    markConversationRead(activeConversationId);
  }, [activeConversationId, markConversationRead]);

  useEffect(() => {
    if (!hasSession || !isAuthenticated) {
      setIsConnected(false);
      return;
    }

    let cancelled = false;
    let ws: WebSocket | null = null;

    const clearReconnectTimer = () => {
      if (mailboxReconnectTimerRef.current !== null) {
        window.clearTimeout(mailboxReconnectTimerRef.current);
        mailboxReconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled || mailboxReconnectTimerRef.current !== null) {
        return;
      }

      const delay = calcReconnectDelayMs(mailboxReconnectAttemptRef.current);
      mailboxReconnectAttemptRef.current += 1;
      mailboxReconnectTimerRef.current = window.setTimeout(() => {
        mailboxReconnectTimerRef.current = null;
        void connectMailbox();
      }, delay);
    };

    const connectMailbox = async () => {
      try {
        const session = await ensureRelayAccessToken();
        if (cancelled || !session?.accessToken) {
          setIsConnected(false);
          return;
        }

        ws = createRelayMailboxWebSocket(session.accessToken);
        ws.onopen = () => {
          if (!cancelled) {
            mailboxReconnectAttemptRef.current = 0; // reset backoff on successful connection
            setIsConnected(true);
          }
        };
        ws.onmessage = (event) => {
          if (cancelled) {
            return;
          }

          void (async () => {
            try {
              const message = JSON.parse(event.data) as MailboxLiveEvent;
              if (message.type !== "envelope") {
                return;
              }

              const result = await ingestRelayEnvelopes([message.envelope], {
                cursor: message.envelope.envelopeId,
              });

              if (result.receivedConversationIds.length) {
                setMailboxRevision((current) => current + 1);
                void refreshShellData({ syncWorkspace: false });
              }
            } catch {
              // Ignore malformed live events and keep the socket alive.
            }
          })();
        };
        ws.onclose = () => {
          if (!cancelled) {
            setIsConnected(false);
            scheduleReconnect();
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!cancelled) {
          setIsConnected(false);
          scheduleReconnect();
        }
      }
    };

    void connectMailbox();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      ws?.close();
      setIsConnected(false);
    };
  }, [hasSession, isAuthenticated, refreshShellData]);

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
    conversations,
    conversationsState,
    isConnected,
    mailboxRevision,
    userName: user?.displayName ?? user?.username ?? "Web user",
    refreshShellData,
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
            {authBootstrapEnabled
              ? "Confirm the email link before using the web app."
              : "Open the web app from a device you already trust."}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
            {authBootstrapEnabled
              ? "The browser covers onboarding, messaging, invite review, search, and settings. Confirm the email link to continue."
              : "The browser covers messaging, invite review, search, and settings. If another EmberChamber device is already signed in, approve this browser with QR and continue here."}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link
              href={publicSignInCta.href}
              className="card transition-colors hover:border-brand-500"
            >
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {publicSignInCta.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {authBootstrapEnabled
                  ? "Use the private inbox that already has beta access, or switch to QR inside the sign-in form."
                  : "Approve this browser from a phone or desktop client that already has a live EmberChamber session."}
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
              <div
                className={clsx(
                  "hidden rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] sm:block",
                  isConnected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                )}
                aria-live="polite"
                aria-label={isConnected ? "Relay link: live" : "Relay link: reconnecting"}
              >
                {isConnected ? "Live relay link" : "Reconnecting"}
              </div>
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
                    Messaging, invite review, search, and settings
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
                Workspace Status
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                    Relay link
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                    {isConnected ? "Live" : "Reconnecting"}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                    Mailbox activity
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                    {mailboxRevision === 0
                      ? "Waiting for first update"
                      : `${mailboxRevision} update${mailboxRevision === 1 ? "" : "s"} seen`}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                    Workspace scope
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                    Messaging, invite review, search, and settings
                  </p>
                </div>
              </div>
            </div>

            <ChatRail
              conversations={conversations}
              conversationsState={conversationsState}
              activeConversationId={activeConversationId}
              preferences={conversationPreferences}
              onRefresh={refreshShellData}
              onOpenConversation={markConversationRead}
              onToggleConversationPinned={toggleConversationPinned}
              onToggleConversationMuted={toggleConversationMuted}
              onToggleConversationArchived={toggleConversationArchived}
            />
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
