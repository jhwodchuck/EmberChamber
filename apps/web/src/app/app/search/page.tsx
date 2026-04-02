"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Avatar } from "@/components/avatar";
import { conversationsApi, searchApi } from "@/lib/api";

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
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "messages" | "channels" | "users">("all");

  async function handleSearch(q: string, nextTab = activeTab) {
    setQuery(q);
    if (q.length < 2) {
      setResults({});
      return;
    }
    setIsSearching(true);
    try {
      const data = await searchApi.search(q, nextTab === "all" ? undefined : nextTab);
      setResults(data as SearchResults);
    } finally {
      setIsSearching(false);
    }
  }

  async function openDm(userId: string) {
    try {
      const { id } = (await conversationsApi.getOrCreateDm(userId)) as { id: string };
      router.push(`/app/chat/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start conversation");
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6">
      <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Search</h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Search stays available on web for the messages, channels, and people you can already
        access. Native remains better for longer sessions and heavier media review.
      </p>
      <input
        type="text"
        value={query}
        onChange={(e) => void handleSearch(e.target.value)}
        className="input mb-4"
        placeholder="Search your messages, channels, and people…"
        autoFocus
      />

      <div className="mb-4 flex gap-1 border-b border-[var(--border)]">
        {(["all", "messages", "channels", "users"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              if (query.length >= 2) {
                void handleSearch(query, tab);
              }
            }}
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
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6 overflow-y-auto">
          {(activeTab === "all" || activeTab === "messages") && (results.messages?.length ?? 0) > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Messages
              </h3>
              <div className="space-y-2">
                {results.messages?.map((msg) => (
                  <Link
                    key={msg.id}
                    href={`/app/chat/${msg.conversation_id}`}
                    className="block card transition-colors hover:bg-[var(--bg-primary)]"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{msg.display_name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="truncate text-sm text-[var(--text-secondary)]">{msg.content}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {(activeTab === "all" || activeTab === "channels") && (results.channels?.length ?? 0) > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Channels
              </h3>
              <div className="space-y-2">
                {results.channels?.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/app/channel/${channel.id}`}
                    className="block card transition-colors hover:bg-[var(--bg-primary)]"
                  >
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-bold text-brand-500">#</span>
                      <span className="font-medium text-[var(--text-primary)]">{channel.name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {channel.member_count} subscribers
                      </span>
                    </div>
                    {channel.description ? (
                      <p className="truncate text-sm text-[var(--text-secondary)]">{channel.description}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {(activeTab === "all" || activeTab === "users") && (results.users?.length ?? 0) > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Users
              </h3>
              <div className="space-y-2">
                {results.users?.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => void openDm(user.id)}
                    className="card flex w-full items-center gap-3 text-left transition-colors hover:bg-[var(--bg-primary)]"
                  >
                    <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{user.display_name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">@{user.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {query.length >= 2 &&
          !isSearching &&
          !results.messages?.length &&
          !results.channels?.length &&
          !results.users?.length ? (
            <p className="py-8 text-center text-[var(--text-secondary)]">
              No results found for &quot;{query}&quot;
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
