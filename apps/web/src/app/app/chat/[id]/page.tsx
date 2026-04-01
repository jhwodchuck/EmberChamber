"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { conversationsApi, uploadFile } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Avatar } from "@/app/app/layout";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

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
  const { id } = useParams<{ id: string }>();
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
    onMessage: useCallback((event: unknown) => {
      const msg = event as { type: string; payload: Record<string, unknown> };
      if (!msg?.type) return;

      if (msg.type === "message.new") {
        const newMsg = msg.payload as Message;
        if (newMsg.conversation_id === id) {
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      } else if (msg.type === "message.edited") {
        const { id: msgId, content: newContent } = msg.payload as { id: string; content: string };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m
          )
        );
      } else if (msg.type === "message.deleted") {
        const { id: msgId } = msg.payload as { id: string };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, deleted_at: new Date().toISOString(), content: undefined } : m
          )
        );
      } else if (msg.type === "user.typing") {
        const { conversationId, userId, isTyping } = msg.payload as {
          conversationId: string;
          userId: string;
          isTyping: boolean;
        };
        if (conversationId === id && userId !== user?.id) {
          setTypingText(isTyping ? "Someone is typing..." : "");
        }
      }
    }, [id, user?.id])
  });

  useEffect(() => {
    if (id) {
      loadConversation();
      loadMessages();
      send({ type: "subscribe.conversation", payload: { conversationId: id } });
    }
  }, [id]);

  async function loadConversation() {
    try {
      const data = await conversationsApi.get(id);
      setConversation(data as ConversationInfo);
    } catch {
      router.push("/app");
    }
  }

  async function loadMessages() {
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
  }

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
      handleSend();
    }
  }

  const convName =
    conversation?.type === "dm"
      ? conversation.members?.find((m) => m.user_id !== user?.id)?.display_name ?? "DM"
      : conversation?.name ?? "Group";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] flex-shrink-0">
        <Avatar src={conversation?.avatar_url} name={convName} size="sm" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] truncate">{convName}</h2>
          {conversation?.is_encrypted && (
            <span className="text-xs text-green-500">🔒 End-to-end encrypted</span>
          )}
          {typingText && (
            <span className="text-xs text-[var(--text-secondary)] italic">{typingText}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-[var(--text-secondary)]">
              <p>No messages yet. Say hello!</p>
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
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000;

              return (
                <div
                  key={msg.id}
                  className={clsx(
                    "flex gap-2 group",
                    isOwn ? "flex-row-reverse" : "flex-row",
                    isGrouped ? "mt-0.5" : "mt-3"
                  )}
                >
                  {!isOwn && (
                    <div className={clsx("w-8 flex-shrink-0", isGrouped && "invisible")}>
                      <Avatar src={msg.avatar_url} name={msg.display_name} size="sm" />
                    </div>
                  )}

                  <div className={clsx("flex flex-col max-w-[70%]", isOwn && "items-end")}>
                    {!isOwn && !isGrouped && conversation?.type !== "dm" && (
                      <span className="text-xs text-[var(--text-secondary)] mb-1 ml-1">
                        {msg.display_name}
                      </span>
                    )}

                    <div
                      className={clsx(
                        "message-bubble relative",
                        isOwn ? "own" : "other",
                        isDeleted && "opacity-50 italic"
                      )}
                    >
                      {isDeleted ? (
                        <span className="text-[var(--text-secondary)]">Message deleted</span>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          {msg.edited_at && (
                            <span className="text-xs opacity-60 ml-2">(edited)</span>
                          )}
                        </>
                      )}
                    </div>

                    <div className={clsx("flex items-center gap-2 mt-0.5 px-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {!isDeleted && (
                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                            title="Reply"
                          >
                            ↩
                          </button>
                          {isOwn && (
                            <>
                              <button
                                onClick={() => { setEditingMessage(msg); setContent(msg.content ?? ""); textareaRef.current?.focus(); }}
                                className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                className="p-1 rounded hover:bg-red-500/10 text-red-400"
                                title="Delete"
                              >
                                🗑
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isOwn && <div className="w-8 flex-shrink-0" />}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-primary)] p-3">
        {(replyTo || editingMessage) && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-brand-500/10 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-brand-500">
                {editingMessage ? "Editing message" : `Replying to ${replyTo?.display_name}`}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {editingMessage?.content ?? replyTo?.content}
              </p>
            </div>
            <button onClick={() => { setReplyTo(null); setEditingMessage(null); setContent(""); }}>✕</button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost p-2 flex-shrink-0"
            title="Attach file"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.txt,.zip"
            onChange={() => handleSend()}
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              conversationsApi.sendTyping(id, true).catch(() => {});
            }}
            onKeyDown={handleKeyDown}
            className="input flex-1 resize-none min-h-[40px] max-h-32 py-2"
            placeholder="Write a message... (Enter to send)"
            rows={1}
            disabled={isSending}
          />

          <button
            type="submit"
            className="btn-primary p-2.5 flex-shrink-0"
            disabled={isSending || !content.trim()}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
