"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Avatar } from "@/components/avatar";
import { relayConversationApi } from "@/lib/relay";

interface User {
  accountId: string;
  username: string;
  displayName: string;
}

export default function NewDmPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const trimmedQuery = query.trim();

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await relayConversationApi.search(q);
      setResults(data.accounts as User[]);
    } finally {
      setIsSearching(false);
    }
  }

  async function startDm(userId: string) {
    try {
      const { id } = await relayConversationApi.openDm(userId);
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
          Search by display name or username. Results only include people you already share access
          with in EmberChamber.
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
        ) : trimmedQuery.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Search shared contacts</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Search by display name or username. If someone is missing, ask them to invite you
              into the same space or send you an invite link first.
            </p>
          </div>
        ) : trimmedQuery.length < 2 ? (
          <p className="py-8 text-center text-[var(--text-secondary)]">
            Type at least 2 characters to search shared contacts.
          </p>
        ) : results.length === 0 ? (
          <div className="rounded-[1.35rem] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-5">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No shared contacts matched</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Results only come from people you already share access with. If this person is
              missing, ask them to invite you into the same space or send you an invite link.
            </p>
          </div>
        ) : (
          results.map((user) => (
            <button
              key={user.accountId}
              type="button"
              onClick={() => void startDm(user.accountId)}
              className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-secondary)]"
            >
              <div className="flex items-center gap-3">
                <Avatar name={user.displayName} size="sm" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.displayName}</p>
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
