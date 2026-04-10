"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import type { ConversationSearchResult } from "@emberchamber/protocol";
import { Avatar } from "@/components/avatar";
import { StatusCallout } from "@/components/status-callout";
import {
  conversationDefaultTitle,
  conversationTypeLabel,
} from "@/lib/conversation-labels";
import { relayConversationApi } from "@/lib/relay";
import { conversationHref } from "@/lib/conversation-routes";

type SearchTab = "all" | "conversations" | "accounts";

const searchTabs: SearchTab[] = ["all", "conversations", "accounts"];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedCommunityId = searchParams?.get("communityId") ?? undefined;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConversationSearchResult>({
    query: "",
    conversations: [],
    accounts: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

  async function handleSearch(nextQuery: string) {
    setQuery(nextQuery);
    setSearchError(null);
    if (nextQuery.trim().length < 2) {
      setResults({
        query: nextQuery,
        conversations: [],
        accounts: [],
      });
      return;
    }

    setIsSearching(true);
    try {
      setResults(
        await relayConversationApi.search(nextQuery.trim(), scopedCommunityId),
      );
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Search failed — the relay may be temporarily unavailable.",
      );
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  async function openAccountDm(accountId: string) {
    try {
      const conversation = await relayConversationApi.openDm(accountId);
      router.push(`/app/chat/${conversation.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to open the DM",
      );
    }
  }

  const showConversations =
    activeTab === "all" || activeTab === "conversations";
  const showAccounts = activeTab === "all" || activeTab === "accounts";

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
        Search
      </h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Search on web is relay-native now. It looks through joined conversation
        metadata and shared contacts, not private message bodies.
      </p>
      {scopedCommunityId ? (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-brand-600">
          Scoped to one joined community
        </p>
      ) : null}

      <label htmlFor="search-input" className="sr-only">
        Search conversations and contacts
      </label>
      <input
        id="search-input"
        type="search"
        name="search"
        value={query}
        onChange={(event) => void handleSearch(event.target.value)}
        className="input mb-4"
        placeholder="Search conversations and shared contacts…"
        aria-describedby={searchError ? "search-error" : undefined}
      />

      {searchError ? (
        <div id="search-error" className="mb-4">
          <StatusCallout tone="error" title="Search unavailable">
            {searchError}
          </StatusCallout>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label="Search result filters"
        className="mb-4 flex gap-1 border-b border-[var(--border)]"
      >
        {searchTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-brand-500 text-brand-500"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isSearching ? (
        <div
          className="flex justify-center py-8"
          aria-label="Searching…"
          role="status"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto">
          {showConversations && results.conversations.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Conversations
              </h3>
              <div className="space-y-2">
                {results.conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={conversationHref({
                      id: conversation.id,
                      kind: conversation.kind,
                    })}
                    className="block card transition-colors hover:bg-[var(--bg-primary)]"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {conversation.title ??
                          conversationDefaultTitle(conversation.kind)}
                      </span>
                      <span className="text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        {conversationTypeLabel(conversation.kind)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {conversation.historyMode === "device_encrypted"
                        ? "Local-first DM history"
                        : conversation.kind === "room"
                          ? "Relay-hosted room history"
                          : conversation.kind === "community"
                            ? "Community container and room index"
                            : "Relay-hosted group history"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {showAccounts && results.accounts.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Accounts
              </h3>
              <div className="space-y-2">
                {results.accounts.map((account) => (
                  <button
                    key={account.accountId}
                    type="button"
                    onClick={() => void openAccountDm(account.accountId)}
                    className="card flex w-full items-center gap-3 text-left transition-colors hover:bg-[var(--bg-primary)]"
                  >
                    <Avatar name={account.displayName} size="sm" />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {account.displayName}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        @{account.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {query.trim().length >= 2 &&
          !isSearching &&
          !searchError &&
          results.conversations.length === 0 &&
          results.accounts.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-secondary)]">
              No joined conversation metadata matched &quot;{query}&quot;.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
