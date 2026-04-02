"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { Avatar } from "@/components/avatar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { conversationsApi, uploadFile } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  content?: string;
  attachment_id?: string;
  reply_to_id?: string;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface ConversationInfo {
  id: string;
  type: string;
  name?: string;
  avatar_url?: string;
  is_encrypted: boolean;
  members?: Array<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    role: string;
  }>;
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuthStore();
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [typingText, setTypingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { send } = useWebSocket({
    onMessage: useCallback(
      (event: unknown) => {
        const msg = event as { type: string; payload: Record<string, unknown> };
        if (!msg?.type) return;

        if (msg.type === "message.new") {
          const newMsg = msg.payload as unknown as Message;
          if (newMsg.conversation_id === id) {
            setMessages((prev) => {
              if (prev.find((message) => message.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 50);
          }
        } else if (msg.type === "message.edited") {
          const { id: msgId, content: newContent } = msg.payload as unknown as {
            id: string;
            content: string;
          };
          setMessages((prev) =>
            prev.map((message) =>
              message.id === msgId
                ? { ...message, content: newContent, edited_at: new Date().toISOString() }
                : message,
            ),
          );
        } else if (msg.type === "message.deleted") {
          const { id: msgId } = msg.payload as unknown as { id: string };
          setMessages((prev) =>
            prev.map((message) =>
              message.id === msgId
                ? { ...message, deleted_at: new Date().toISOString(), content: undefined }
                : message,
            ),
          );
        } else if (msg.type === "user.typing") {
          const { conversationId, userId, isTyping } = msg.payload as {
            conversationId: string;
            userId: string;
            isTyping: boolean;
          };
          if (conversationId === id && userId !== user?.id) {
            setTypingText(isTyping ? "Someone is typing…" : "");
          }
        }
      },
      [id, user?.id],
    ),
  });

  const loadConversation = useCallback(async () => {
    try {
      const data = await conversationsApi.get(id);
      setConversation(data as ConversationInfo);
    } catch {
      router.push("/app");
    }
  }, [id, router]);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await conversationsApi.getMessages(id);
      setMessages(data as Message[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void loadConversation();
      void loadMessages();
      send({ type: "subscribe.conversation", payload: { conversationId: id } });
    }
  }, [id, loadConversation, loadMessages, send]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();

    if (editingMessage) {
      if (!content.trim()) return;
      try {
        await conversationsApi.editMessage(id, editingMessage.id, content.trim());
        setEditingMessage(null);
        setContent("");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to edit");
      }
      return;
    }

    if (!content.trim() && !fileInputRef.current?.files?.length) return;

    setIsSending(true);
    try {
      let attachmentId: string | undefined;

      if (fileInputRef.current?.files?.length) {
        const file = fileInputRef.current.files[0];
        const uploaded = await uploadFile(file);
        attachmentId = uploaded.id;
        if (fileInputRef.current) fileInputRef.current.value = "";
      }

      await conversationsApi.sendMessage(id, {
        content: content.trim() || undefined,
        type: attachmentId ? "file" : "text",
        attachmentId,
        replyToId: replyTo?.id,
      });

      setContent("");
      setReplyTo(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDelete(msgId: string) {
    try {
      await conversationsApi.deleteMessage(id, msgId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const conversationName =
    conversation?.type === "dm"
      ? conversation.members?.find((member) => member.user_id !== user?.id)?.display_name ?? "DM"
      : conversation?.name ?? "Group";
  const trustLabel =
    conversation?.type === "dm" ? "Private direct message" : "Hosted group conversation";
  const composerPlaceholder =
    conversation?.type === "dm" ? "Write a private message…" : "Post to the conversation…";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-start gap-3 border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
        <Avatar src={conversation?.avatar_url} name={conversationName} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-[var(--text-primary)]">{conversationName}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{trustLabel}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Web chat works here. Native remains preferred for longer sessions and heavier media.
          </p>
          {typingText ? <p className="mt-1 text-xs italic text-[var(--text-secondary)]">{typingText}</p> : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-[var(--text-secondary)]">
              <p>No messages yet. Say hello.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isOwn = msg.sender_id === user?.id;
              const isDeleted = !!msg.deleted_at;
              const prevMsg = messages[idx - 1];
              const isGrouped =
                prevMsg &&
                prevMsg.sender_id === msg.sender_id &&
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60_000;

              return (
                <div
                  key={msg.id}
                  className={clsx(
                    "group flex gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row",
                    isGrouped ? "mt-0.5" : "mt-3",
                  )}
                >
                  {!isOwn ? (
                    <div className={clsx("w-8 flex-shrink-0", isGrouped && "invisible")}>
                      <Avatar src={msg.avatar_url} name={msg.display_name} size="sm" />
                    </div>
                  ) : null}

                  <div className={clsx("flex max-w-[70%] flex-col", isOwn && "items-end")}>
                    {!isOwn && !isGrouped && conversation?.type !== "dm" ? (
                      <span className="mb-1 ml-1 text-xs text-[var(--text-secondary)]">{msg.display_name}</span>
                    ) : null}

                    <div
                      className={clsx(
                        "message-bubble relative",
                        isOwn ? "own" : "other",
                        isDeleted && "opacity-50 italic",
                      )}
                    >
                      {isDeleted ? (
                        <span className="text-[var(--text-secondary)]">Message deleted</span>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          {msg.edited_at ? <span className="ml-2 text-xs opacity-60">(edited)</span> : null}
                        </>
                      )}
                    </div>

                    <div
                      className={clsx(
                        "mt-0.5 flex items-center gap-2 px-1",
                        isOwn ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {!isDeleted ? (
                        <div className="hidden items-center gap-1 group-hover:flex">
                          <button
                            type="button"
                            onClick={() => setReplyTo(msg)}
                            className="rounded px-1.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Reply
                          </button>
                          {isOwn ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setContent(msg.content ?? "");
                                  textareaRef.current?.focus();
                                }}
                                className="rounded px-1.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(msg.id)}
                                className="rounded px-1.5 py-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-500"
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {isOwn ? <div className="w-8 flex-shrink-0" /> : null}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-primary)] p-3">
        {replyTo || editingMessage ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-brand-500/10 px-3 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-brand-500">
                {editingMessage ? "Editing message" : `Replying to ${replyTo?.display_name}`}
              </p>
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {editingMessage?.content ?? replyTo?.content}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setEditingMessage(null);
                setContent("");
              }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Clear reply or edit state"
            >
              Clear
            </button>
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSend(event)} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost flex-shrink-0 px-3 py-2"
            aria-label="Attach a file"
          >
            Attach
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.txt,.zip"
            onChange={() => void handleSend()}
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              void conversationsApi.sendTyping(id, true).catch(() => undefined);
            }}
            onKeyDown={handleKeyDown}
            className="input min-h-[40px] max-h-32 flex-1 resize-none py-2"
            placeholder={`${composerPlaceholder} (Enter to send)`}
            rows={1}
            disabled={isSending}
          />

          <button
            type="submit"
            className="btn-primary flex-shrink-0 px-4 py-2.5"
            disabled={isSending || (!content.trim() && !fileInputRef.current?.files?.length)}
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
