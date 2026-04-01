"use client";

import { useState, useEffect } from "react";
import { channelsApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Channel {
  id: string;
  name: string;
  description?: string;
  member_count: number;
  visibility: string;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadChannels(); }, []);

  async function loadChannels(q?: string) {
    setIsLoading(true);
    try {
      const data = await channelsApi.list(q);
      setChannels(data as Channel[]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleJoin(channelId: string) {
    try {
      await channelsApi.join(channelId);
      toast.success("Joined!");
      router.push(`/app/channel/${channelId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    }
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Discover Channels</h2>
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); loadChannels(e.target.value || undefined); }}
        className="input mb-4"
        placeholder="Search public channels..."
      />
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : channels.length === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-8">No channels found</p>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => (
            <div key={ch.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-[var(--text-primary)]">#{ch.name}</span>
                </div>
                {ch.description && (
                  <p className="text-sm text-[var(--text-secondary)] truncate">{ch.description}</p>
                )}
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{ch.member_count} subscribers</p>
              </div>
              <button onClick={() => handleJoin(ch.id)} className="btn-primary text-sm flex-shrink-0">
                Subscribe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
