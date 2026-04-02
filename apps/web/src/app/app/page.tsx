"use client";

import { ArrowRight, MessageSquare, Search, Settings, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useCompanionShell } from "@/components/companion-shell";
import { StatusCallout } from "@/components/status-callout";

const actionCards = [
  {
    href: "/app/new-dm",
    label: "Start a DM",
    description: "Open a direct conversation from the web app when that is the fastest path.",
    icon: MessageSquare,
  },
  {
    href: "/app/search",
    label: "Search Joined Spaces",
    description: "Find conversation metadata and shared contacts you already have access to.",
    icon: Search,
  },
  {
    href: "/app/new-group",
    label: "Create a Group",
    description: "Set member boundaries and the first invite before the conversation starts.",
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

export default function AppHome() {
  const { userName } = useCompanionShell();

  return (
    <div className="space-y-8 p-6 sm:p-8">
      <section className="panel overflow-hidden px-6 py-7 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="eyebrow">Web Workspace</div>
            <h2 className="mt-5 text-balance font-display text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">
              Web messaging stays available. Native stays preferred.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">
              Welcome back, {userName}. The browser can handle direct messages, groups,
              communities, invite review, search, and account settings. Android and desktop should
              still be the higher-headroom surfaces for daily primary use and heavier media traffic.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Web role
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Fast & flexible</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Good for quick messaging, search, onboarding, and admin tasks.
                </p>
              </div>
              <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Native role
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Primary use</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Better for always-on sessions, device integration, and heavier media flows.
                </p>
              </div>
              <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                  Trust boundary
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">Invite-first</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Keep access deliberate even when the browser stays fully capable.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[1.7rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent),linear-gradient(160deg,#2a1512,#120a0b)] p-5 text-white shadow-[0_20px_60px_rgba(32,19,18,0.22)]">
            <p className="text-sm uppercase tracking-[0.2em] text-[#f8bc9c]">Start from here</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-[#f3ddd3]">
              <p>Open a DM or jump into an existing chat from the browser.</p>
              <p>Use search when you know what you are trying to reach inside spaces you already joined.</p>
              <p>Create groups or communities here, review invites, then shift heavier usage to native when needed.</p>
            </div>
            <div className="mt-6 space-y-3">
              <Link href="/app/new-dm" className="btn-primary w-full">
                Start a DM
              </Link>
              <Link
                href="/app/search"
                className="btn-ghost w-full border-white/15 bg-white/5 text-white hover:text-white"
              >
                Search the Workspace
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <StatusCallout tone="info" title="Secondary surface, not a blocked one">
        The browser should remain useful for real messaging. The constraint is capacity and primary
        usage expectations, not an artificial ban on chat.
      </StatusCallout>

      <section className="grid gap-5 xl:grid-cols-3">
        {actionCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link key={card.href} href={card.href} className="panel px-6 py-7 transition-colors hover:border-brand-500">
              <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <p className="mt-4 text-xl font-semibold text-[var(--text-primary)]">{card.label}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{card.description}</p>
            </Link>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/download" className="btn-ghost">
          Check native builds
        </Link>
        <Link href="/trust-and-safety" className="btn-ghost">
          Read trust model
        </Link>
        <Link href="/app/new-dm" className="btn-primary">
          Message from web
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
