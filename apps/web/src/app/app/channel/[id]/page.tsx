"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Avatar } from "@/components/avatar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { channelsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

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
    onMessage: useCallback(
      (event: unknown) => {
        const msg = event as { type: string; payload: Post };
        if (msg.type === "channel.post.new" && msg.payload.channel_id === id) {
          setPosts((prev) => {
            if (prev.find((post) => post.id === msg.payload.id)) return prev;
            return [...prev, msg.payload];
          });
        }
      },
      [id],
    ),
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
      void loadChannel();
      void loadPosts();
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
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, deleted_at: new Date().toISOString() } : post,
        ),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-start gap-3 border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-lg font-bold text-brand-500">
          #
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[var(--text-primary)]">{channel?.name}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {channel?.member_count ?? 0} subscribers · {channel?.visibility}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Channel reading and posting stay available on web. Native remains preferred for heavier
            live activity.
          </p>
        </div>
        {!channel?.myRole ? (
          <button type="button" onClick={() => void handleJoin()} className="btn-primary text-sm">
            Subscribe
          </button>
        ) : null}
      </div>

      {channel?.description ? (
        <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2">
          <p className="text-sm text-[var(--text-secondary)]">{channel.description}</p>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-secondary)]">
            <p className="mb-3 text-4xl">#</p>
            <p>No posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className={clsx("card group", post.deleted_at && "opacity-50")}>
              <div className="flex items-start gap-3">
                <Avatar src={post.avatar_url} name={post.display_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{post.display_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                      {(isPublisher || post.author_id === user?.id) && !post.deleted_at ? (
                        <button
                          type="button"
                          onClick={() => void handleDeletePost(post.id)}
                          className="hidden text-xs text-red-400 hover:text-red-500 group-hover:block"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {post.deleted_at ? (
                    <p className="mt-1 text-sm italic text-[var(--text-secondary)]">Post deleted</p>
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{post.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isPublisher ? (
        <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-primary)] p-3">
          <form onSubmit={(event) => void handlePost(event)} className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input flex-1 resize-none"
              placeholder="Write a post…"
              rows={2}
              disabled={isSending}
            />
            <button type="submit" className="btn-primary self-end" disabled={isSending || !content.trim()}>
              {isSending ? "Posting…" : "Post"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
