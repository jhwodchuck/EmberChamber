"use client";

import {
  Archive,
  BellOff,
  MessageSquareText,
  Pin,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { ConversationRow, IconButton, Input, Tabs } from "@emberchamber/ui/components";
import {
  CHAT_LIST_FILTERS,
  type ChatListFilter,
  type ConversationPreference,
  createConversationPreference,
} from "@/lib/conversation-preferences";
import {
  conversationDefaultTitle,
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
  const router = useRouter();
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
          conversation.type,
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
        <IconButton
          size="sm"
          label="Refresh conversation rail"
          onClick={() => void onRefresh()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="mt-5">
        <Input
          id="chat-rail-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search joined chats"
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      <div className="mt-4">
        <Tabs
          tabs={[...CHAT_LIST_FILTERS]}
          value={filter}
          onChange={(v) => setFilter(v as ChatListFilter)}
        />
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
                style={{ display: "flex", alignItems: "stretch", gap: "4px" }}
              >
                <ConversationRow
                  style={{ flex: 1, minWidth: 0 }}
                  name={conversation.name ?? conversationDefaultTitle(conversation.type)}
                  type={conversation.type}
                  preview={conversation.lastMessage?.content ?? undefined}
                  time={formatTimestamp(conversation.updatedAt)}
                  unread={conversation.unreadCount}
                  historyMode={conversation.historyMode}
                  active={isActive}
                  onClick={() => {
                    onOpenConversation(conversation.id);
                    router.push(conversation.href);
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: "2px",
                    paddingBlock: "4px",
                  }}
                >
                  <IconButton
                    size="sm"
                    label={preference.isPinned ? "Unpin conversation" : "Pin conversation"}
                    active={preference.isPinned}
                    onClick={() => onToggleConversationPinned(conversation.id)}
                  >
                    <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label={preference.isMuted ? "Unmute conversation" : "Mute conversation"}
                    active={preference.isMuted}
                    onClick={() => onToggleConversationMuted(conversation.id)}
                  >
                    <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label={
                      preference.isArchived
                        ? "Return conversation to the main rail"
                        : "Archive conversation"
                    }
                    active={preference.isArchived}
                    onClick={() => onToggleConversationArchived(conversation.id)}
                  >
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                  </IconButton>
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
