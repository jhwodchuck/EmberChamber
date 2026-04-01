"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, conversationsApi } from "@/lib/api";
import { Avatar } from "@/app/app/layout";
import toast from "react-hot-toast";

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
    if (q.length < 2) { setResults([]); return; }
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
      const { id } = await conversationsApi.getOrCreateDm(userId);
      router.push(`/app/chat/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start conversation");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h2 className="font-semibold text-[var(--text-primary)] mb-3">New Message</h2>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="input"
          placeholder="Search users..."
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isSearching ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 && query.length >= 2 ? (
          <p className="text-center text-[var(--text-secondary)] py-8">No users found</p>
        ) : (
          results.map((u) => (
            <button
              key={u.id}
              onClick={() => startDm(u.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <Avatar src={u.avatar_url} name={u.display_name} size="sm" />
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--text-primary)]">{u.display_name}</p>
                <p className="text-xs text-[var(--text-secondary)]">@{u.username}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
