"use client";

import { ArrowRight, MessageSquare, Search, Settings, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useCompanionShell } from "@/components/companion-shell";
import { StatusCallout } from "@/components/status-callout";
import { conversationDefaultTitle, conversationTypeLabel } from "@/lib/conversation-labels";

const actionCards = [
  {
    href: "/app/new-dm",
    label: "Start a DM",
    description: "Open a direct conversation with a shared contact.",
    icon: MessageSquare,
  },
  {
    href: "/app/search",
    label: "Search Conversations",
    description: "Find joined conversations and shared contacts.",
    icon: Search,
  },
  {
    href: "/app/new-group",
    label: "Create a Group",
    description: "Set the member boundary and first invite.",
    icon: Users,
  },
  {
    href: "/app/discover",
    label: "Review an Invite",
    description: "Preview where a link leads before you join.",
    icon: ShieldCheck,
  },
  {
    href: "/app/new-community",
    label: "Create a Community",
    description: "Set up a multi-room space with scoped invites.",
    icon: Users,
  },
  {
    href: "/app/settings",
    label: "Open Settings",
    description: "Review privacy defaults, sessions, and recovery.",
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
  const resumeConversation = recentConversations[0] ?? null;
  const primaryActions = actionCards.slice(0, 4);
  const secondaryActions = actionCards.slice(4);

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <section className="panel overflow-hidden px-6 py-7 sm:px-8">
        <div className="space-y-6">
          <div>
            <div className="eyebrow">Overview</div>
            <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              Continue the conversation.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
              Welcome back, {userName}. Threads come first, then quick actions.
            </p>
          </div>

          {resumeConversation ? (
            <Link
              href={resumeConversation.href}
              className="block rounded-[1.5rem] border border-brand-500/45 bg-brand-500/[0.08] px-5 py-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brand-500"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Resume thread</p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {resumeConversation.name ?? conversationDefaultTitle(resumeConversation.type)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {resumeConversation.lastMessage?.content ?? "No local preview yet"}
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                  {conversationTypeLabel(resumeConversation.type)}
                </span>
              </div>
            </Link>
          ) : null}

          <aside className="flex flex-wrap gap-3">
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              {conversations.length} conversations
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              Relay {isConnected ? "live" : "reconnecting"}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              Search and invite review available
            </span>
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
                  Start a DM, create a Group, or review an Invite to give the workspace something
                  to resume. If DM search is empty, you probably do not share access with anyone
                  yet on this account.
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
                          {conversation.name ?? conversationDefaultTitle(conversation.type)}
                        </p>
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                          {conversationTypeLabel(conversation.type)}
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
            <p className="section-kicker">Admin & Settings</p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Handle policy and account details</h3>
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
                View downloads
              </Link>
              <Link href="/app/new-dm" className="btn-primary">
                Start a DM
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
