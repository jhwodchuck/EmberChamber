"use client";

import {
  Archive,
  BellOff,
  MessageSquareText,
  Pin,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  CHAT_LIST_FILTERS,
  type ChatListFilter,
  type ConversationPreference,
  createConversationPreference,
} from "@/lib/conversation-preferences";
import {
  conversationDefaultTitle,
  conversationTypeLabel,
} from "@/lib/conversation-labels";

type ConversationItem = {
  id: string;
  type: "dm" | "group" | "community" | "room";
  name?: string;
  href: string;
  updatedAt: string;
  unreadCount: number;
  memberCount: number;
  historyMode: "relay_hosted" | "device_encrypted";
  lastMessage?: { content?: string | null } | null;
};

type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  message?: string;
};

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay =
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate();

  if (sameDay) {
    return parsed.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function ChatRail({
  conversations,
  conversationsState,
  activeConversationId,
  preferences,
  onRefresh,
  onOpenConversation,
  onToggleConversationPinned,
  onToggleConversationMuted,
  onToggleConversationArchived,
}: {
  conversations: ConversationItem[];
  conversationsState: LoadState;
  activeConversationId: string | null;
  preferences: Record<string, ConversationPreference>;
  onRefresh: () => Promise<void>;
  onOpenConversation: (conversationId: string) => void;
  onToggleConversationPinned: (conversationId: string) => void;
  onToggleConversationMuted: (conversationId: string) => void;
  onToggleConversationArchived: (conversationId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatListFilter>("all");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredConversations = useMemo(() => {
    return conversations
      .filter((conversation) => {
        const preference =
          preferences[conversation.id] ??
          createConversationPreference(conversation.id);
        const isActive = activeConversationId === conversation.id;

        if (!isActive) {
          if (filter === "unread" && conversation.unreadCount < 1) {
            return false;
          }

          if (filter === "pinned" && !preference.isPinned) {
            return false;
          }

          if (filter === "archived" && !preference.isArchived) {
            return false;
          }

          if (filter !== "archived" && preference.isArchived) {
            return false;
          }
        }

        if (!deferredSearch) {
          return true;
        }

        const haystack = [
          conversation.name ?? conversationDefaultTitle(conversation.type),
          conversation.lastMessage?.content ?? "",
          conversationTypeLabel(conversation.type),
          conversation.historyMode === "device_encrypted"
            ? "local-first"
            : "relay-hosted",
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(deferredSearch);
      })
      .sort((left, right) => {
        const leftPreference =
          preferences[left.id] ?? createConversationPreference(left.id);
        const rightPreference =
          preferences[right.id] ?? createConversationPreference(right.id);

        if (leftPreference.isPinned !== rightPreference.isPinned) {
          return leftPreference.isPinned ? -1 : 1;
        }

        if (left.unreadCount !== right.unreadCount) {
          return right.unreadCount - left.unreadCount;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [activeConversationId, conversations, deferredSearch, filter, preferences]);

  const unreadConversationCount = useMemo(
    () => conversations.filter((conversation) => conversation.unreadCount > 0).length,
    [conversations],
  );

  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            Chats
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
            Conversation rail
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {conversations.length} total, {unreadConversationCount} unread
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="btn-ghost px-3"
          aria-label="Refresh conversation rail"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <label
        htmlFor="chat-rail-search"
        className="mt-5 flex items-center gap-3 rounded-[1.3rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
      >
        <Search className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
        <input
          id="chat-rail-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search joined chats"
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        {CHAT_LIST_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
              filter === option
                ? "border-brand-500 bg-brand-500/10 text-brand-600"
                : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {conversationsState.status === "loading" ? (
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 text-sm text-[var(--text-secondary)]">
            Syncing the latest relay and local conversation previews…
          </div>
        ) : conversationsState.status === "error" ? (
          <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 text-sm text-[var(--text-secondary)]">
            {conversationsState.message ?? "Unable to load the conversation rail."}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5 text-sm leading-6 text-[var(--text-secondary)]">
            {search.trim()
              ? "No joined conversations matched this search."
              : filter === "archived"
                ? "Archived conversations will collect here once you tuck them away."
                : "Start a DM, create a group, or accept an invite to populate the rail."}
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const preference =
              preferences[conversation.id] ??
              createConversationPreference(conversation.id);
            const isActive = activeConversationId === conversation.id;

            return (
              <div
                key={conversation.id}
                className={clsx(
                  "group rounded-[1.45rem] border transition-colors",
                  isActive
                    ? "border-brand-500/60 bg-brand-500/[0.08]"
                    : "border-[var(--border)] bg-[var(--bg-secondary)]",
                )}
              >
                <div className="flex items-stretch gap-2">
                  <Link
                    href={conversation.href}
                    onClick={() => onOpenConversation(conversation.id)}
                    className="min-w-0 flex-1 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={clsx(
                              "truncate text-sm font-semibold",
                              conversation.unreadCount > 0
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-primary)]/90",
                            )}
                          >
                            {conversation.name ??
                              conversationDefaultTitle(conversation.type)}
                          </p>
                          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                            {conversationTypeLabel(conversation.type)}
                          </span>
                          {preference.isMuted ? (
                            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                              muted
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-[var(--text-secondary)]">
                          {conversation.lastMessage?.content ??
                            (conversation.historyMode === "device_encrypted"
                              ? "Encrypted chat ready in this browser."
                              : "No message preview yet.")}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          {formatTimestamp(conversation.updatedAt)}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      <span>{conversation.memberCount} members</span>
                      <span>
                        {conversation.historyMode === "device_encrypted"
                          ? "Local-first"
                          : "Relay-hosted"}
                      </span>
                    </div>
                  </Link>

                  <div className="flex flex-col justify-center gap-1 px-2 py-2">
                    <button
                      type="button"
                      title={preference.isPinned ? "Unpin conversation" : "Pin conversation"}
                      onClick={() => onToggleConversationPinned(conversation.id)}
                      className={clsx(
                        "rounded-full border p-2 text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600",
                        preference.isPinned
                          ? "border-brand-500/40 bg-brand-500/10 text-brand-600"
                          : "border-transparent bg-transparent",
                      )}
                    >
                      <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={preference.isMuted ? "Unmute conversation" : "Mute conversation"}
                      onClick={() => onToggleConversationMuted(conversation.id)}
                      className={clsx(
                        "rounded-full border p-2 text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600",
                        preference.isMuted
                          ? "border-brand-500/40 bg-brand-500/10 text-brand-600"
                          : "border-transparent bg-transparent",
                      )}
                    >
                      <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={
                        preference.isArchived
                          ? "Return conversation to the main rail"
                          : "Archive conversation"
                      }
                      onClick={() => onToggleConversationArchived(conversation.id)}
                      className={clsx(
                        "rounded-full border p-2 text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600",
                        preference.isArchived
                          ? "border-brand-500/40 bg-brand-500/10 text-brand-600"
                          : "border-transparent bg-transparent",
                      )}
                    >
                      <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
          <MessageSquareText className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Secondary surface, real workspace
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Use the browser for active chat, invite review, joined-space search, and settings when the native client is not the better fit.
        </p>
      </div>
    </section>
  );
}
