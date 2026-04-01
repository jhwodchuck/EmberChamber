"use client";

import { useState } from "react";
import { searchApi } from "@/lib/api";
import { Avatar } from "@/app/app/layout";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface SearchResults {
  messages?: Array<{
    id: string;
    conversation_id: string;
    content: string;
    created_at: string;
    display_name: string;
    conv_name?: string;
  }>;
  channels?: Array<{
    id: string;
    name: string;
    description?: string;
    member_count: number;
  }>;
  users?: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  }>;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "messages" | "channels" | "users">("all");

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) { setResults({}); return; }
    setIsSearching(true);
    try {
      const data = await searchApi.search(q, activeTab === "all" ? undefined : activeTab);
      setResults(data as SearchResults);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Search</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        Search only returns conversations, channels, and profiles you can
        already access.
      </p>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="input mb-4"
        placeholder="Search your messages, channels, and people..."
        autoFocus
      />

      <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
        {(["all", "messages", "channels", "users"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (query.length >= 2) handleSearch(query); }}
            className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "text-brand-500 border-b-2 border-brand-500"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isSearching ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto">
          {/* Messages */}
          {(activeTab === "all" || activeTab === "messages") && (results.messages?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Messages</h3>
              <div className="space-y-2">
                {results.messages?.map((msg) => (
                  <Link
                    key={msg.id}
                    href={`/app/chat/${msg.conversation_id}`}
                    className="block card hover:bg-[var(--bg-primary)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{msg.display_name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{msg.content}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Channels */}
          {(activeTab === "all" || activeTab === "channels") && (results.channels?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Your Channels</h3>
              <div className="space-y-2">
                {results.channels?.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/app/channel/${ch.id}`}
                    className="block card hover:bg-[var(--bg-primary)] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-brand-500 font-bold">#</span>
                      <span className="font-medium text-[var(--text-primary)]">{ch.name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{ch.member_count} subscribers</span>
                    </div>
                    {ch.description && (
                      <p className="text-sm text-[var(--text-secondary)] truncate">{ch.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {(activeTab === "all" || activeTab === "users") && (results.users?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Users</h3>
              <div className="space-y-2">
                {results.users?.map((u) => (
                  <div key={u.id} className="card flex items-center gap-3">
                    <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{u.display_name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query.length >= 2 && !isSearching && !results.messages?.length && !results.channels?.length && !results.users?.length && (
            <p className="text-center text-[var(--text-secondary)] py-8">No results found for &quot;{query}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
}
