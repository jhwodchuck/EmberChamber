"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { channelsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Avatar } from "@/components/avatar";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { clsx } from "clsx";

interface Channel {
  id: string;
  name: string;
  description?: string;
  visibility: string;
  member_count: number;
  myRole?: string;
}

interface Post {
  id: string;
  channel_id: string;
  author_id: string;
  content?: string;
  deleted_at?: string;
  edited_at?: string;
  created_at: string;
  display_name: string;
  avatar_url?: string;
  reaction_count?: number;
}

export default function ChannelPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuthStore();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const isPublisher = channel?.myRole && ["owner", "admin", "moderator"].includes(channel.myRole);

  const { send } = useWebSocket({
    onMessage: useCallback((event: unknown) => {
      const msg = event as { type: string; payload: Post };
      if (msg.type === "channel.post.new" && msg.payload.channel_id === id) {
        setPosts((prev) => {
          if (prev.find((p) => p.id === msg.payload.id)) return prev;
          return [...prev, msg.payload];
        });
      }
    }, [id])
  });

  const loadChannel = useCallback(async () => {
    try {
      const data = await channelsApi.get(id);
      setChannel(data as Channel);
    } catch {
      router.push("/app");
    }
  }, [id, router]);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await channelsApi.getPosts(id);
      setPosts(data as Post[]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadChannel();
      loadPosts();
      send({ type: "subscribe.channel", payload: { channelId: id } });
    }
  }, [id, loadChannel, loadPosts, send]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSending(true);
    try {
      await channelsApi.createPost(id, { content: content.trim() });
      setContent("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsSending(false);
    }
  }

  async function handleJoin() {
    try {
      await channelsApi.join(id);
      await loadChannel();
      toast.success("Joined channel");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join");
    }
  }

  async function handleDeletePost(postId: string) {
    try {
      await channelsApi.deletePost(id, postId);
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, deleted_at: new Date().toISOString() } : p));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center text-lg font-bold">
          #
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)]">{channel?.name}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {channel?.member_count ?? 0} subscribers · {channel?.visibility}
          </p>
        </div>
        {!channel?.myRole && (
          <button onClick={handleJoin} className="btn-primary text-sm">
            Subscribe
          </button>
        )}
      </div>

      {channel?.description && (
        <div className="px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
          <p className="text-sm text-[var(--text-secondary)]">{channel.description}</p>
        </div>
      )}

      {/* Posts */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <p className="text-4xl mb-3">📢</p>
            <p>No posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className={clsx("card group", post.deleted_at && "opacity-50")}>
              <div className="flex items-start gap-3">
                <Avatar src={post.avatar_url} name={post.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-[var(--text-primary)]">
                      {post.display_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                      {(isPublisher || post.author_id === user?.id) && !post.deleted_at && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="hidden group-hover:block text-xs text-red-400 hover:text-red-500"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {post.deleted_at ? (
                    <p className="text-sm italic text-[var(--text-secondary)] mt-1">Post deleted</p>
                  ) : (
                    <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Compose (publishers only) */}
      {isPublisher && (
        <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-primary)] p-3">
          <form onSubmit={handlePost} className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input flex-1 resize-none"
              placeholder="Write a post..."
              rows={2}
              disabled={isSending}
            />
            <button type="submit" className="btn-primary self-end" disabled={isSending || !content.trim()}>
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
