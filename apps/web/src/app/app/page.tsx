"use client";

import { ArrowRight, MessageSquare, Search, Settings, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useCompanionShell } from "@/components/companion-shell";
import { StatusCallout } from "@/components/status-callout";

const actionCards = [
  {
    href: "/app/new-dm",
    label: "Start a DM",
    description: "Open a direct conversation from the browser when that is the fastest path.",
    icon: MessageSquare,
  },
  {
    href: "/app/search",
    label: "Search Conversations",
    description: "Find joined conversations and shared contacts you already have access to.",
    icon: Search,
  },
  {
    href: "/app/new-group",
    label: "Create a Group",
    description: "Set the member boundary and the first invite before the conversation starts.",
    icon: Users,
  },
  {
    href: "/app/new-community",
    label: "Create a Community",
    description: "Stand up a multi-room space with organizer policies and scoped invites.",
    icon: Users,
  },
  {
    href: "/app/discover",
    label: "Review an Invite",
    description: "Preview where a link leads before you join it from this account.",
    icon: ShieldCheck,
  },
  {
    href: "/app/settings",
    label: "Open Settings",
    description: "Keep privacy defaults, device sessions, and recovery options readable.",
    icon: Settings,
  },
] as const;

const overviewDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

export default function AppHome() {
  const { conversations, conversationsState, isConnected, refreshShellData, userName } = useCompanionShell();
  const recentConversations = conversations.slice(0, 5);
  const primaryActions = actionCards.slice(0, 4);
  const secondaryActions = actionCards.slice(4);

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <section className="panel overflow-hidden px-6 py-7 sm:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="eyebrow">Overview</div>
            <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              Continue from where you left off.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
              Welcome back, {userName}. Recent conversations, invite review, search, and quick
              compose should all be reachable from here without another tour of the product.
            </p>
          </div>

          <aside className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              {
                label: "Conversations",
                value: String(conversations.length),
                detail: conversations.length === 0 ? "Nothing started yet" : "Ready to resume",
              },
              {
                label: "Relay link",
                value: isConnected ? "Live" : "Waiting",
                detail: isConnected ? "Mailbox updates are flowing" : "Trying to reconnect",
              },
              {
                label: "Best next move",
                value: recentConversations.length > 0 ? "Resume" : "Start a DM",
                detail: recentConversations.length > 0 ? "Pick up an existing thread" : "Open the first conversation",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{item.value}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.detail}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <section className="panel px-6 py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Resume</p>
              <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Recent conversations</h3>
            </div>
            <button type="button" className="btn-ghost" onClick={() => void refreshShellData()}>
              Refresh
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {conversationsState.status === "loading" ? (
              <StatusCallout tone="info" title="Syncing conversations">
                Pulling the latest conversation list from the relay and local preview cache.
              </StatusCallout>
            ) : conversationsState.status === "error" ? (
              <StatusCallout tone="warning" title="Unable to load recent conversations">
                {conversationsState.message ?? "The recent conversation list could not be refreshed."}
              </StatusCallout>
            ) : recentConversations.length === 0 ? (
              <div className="rounded-[1.45rem] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-6">
                <p className="text-base font-semibold text-[var(--text-primary)]">No conversations yet</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Start a DM, create a group, or review an invite to give the workspace something to resume.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/app/new-dm" className="btn-primary">
                    Start a DM
                  </Link>
                  <Link href="/app/discover" className="btn-ghost">
                    Review an invite
                  </Link>
                </div>
              </div>
            ) : (
              recentConversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={conversation.href}
                  className="block rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-500"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                          {conversation.name ??
                            (conversation.type === "dm"
                              ? "Direct message"
                              : conversation.type === "community"
                                ? "Community"
                                : conversation.type === "room"
                                  ? "Room"
                                  : "Group")}
                        </p>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                          {conversation.type === "dm"
                            ? "DM"
                            : conversation.type === "community"
                              ? "Community"
                              : conversation.type === "room"
                                ? "Room"
                                : "Group"}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm text-[var(--text-secondary)]">
                        {conversation.lastMessage?.content ?? "No local preview yet"}
                      </p>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {overviewDateFormatter.format(new Date(conversation.updatedAt))}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel px-6 py-7">
            <p className="section-kicker">Start Something</p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Quick actions</h3>
            <div className="mt-6 grid gap-3">
              {primaryActions.map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-500"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{card.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{card.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="panel px-6 py-7">
            <p className="section-kicker">Admin & Recovery</p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Keep the account readable</h3>
            <div className="mt-6 space-y-3">
              {secondaryActions.map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    key={card.href}
                    href={card.href}
                    className="flex items-start gap-3 rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-500"
                  >
                    <Icon className="mt-0.5 h-4 w-4 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{card.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{card.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/download" className="btn-ghost">
                Check native builds
              </Link>
              <Link href="/app/new-dm" className="btn-primary">
                Message from web
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
