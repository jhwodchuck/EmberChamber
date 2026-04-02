"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Avatar } from "@/components/avatar";
import { conversationsApi, usersApi } from "@/lib/api";

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export default function NewDmPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await usersApi.search(q);
      setResults(data as User[]);
    } finally {
      setIsSearching(false);
    }
  }

  async function startDm(userId: string) {
    try {
      const { id } = (await conversationsApi.getOrCreateDm(userId)) as { id: string };
      router.push(`/app/chat/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start conversation");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="mb-2 font-semibold text-[var(--text-primary)]">New Message</h2>
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          Start a DM on web when it is the fastest path. Native stays preferred for longer and
          media-heavier conversations.
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => void handleSearch(e.target.value)}
          className="input"
          placeholder="Search people by name or username…"
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isSearching ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : results.length === 0 && query.length >= 2 ? (
          <p className="py-8 text-center text-[var(--text-secondary)]">No users found</p>
        ) : (
          results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => void startDm(user.id)}
              className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <div className="flex items-center gap-3">
                <Avatar src={user.avatar_url} name={user.display_name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.display_name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">@{user.username}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
