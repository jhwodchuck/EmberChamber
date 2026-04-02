"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ConversationDetail, GroupThreadMessage } from "@emberchamber/protocol";
import { Avatar } from "@/components/avatar";
import { relayAttachmentApi, relayConversationApi, uploadAttachment } from "@/lib/relay";
import {
  ensureWorkspaceReady,
  listStoredDmMessages,
  readDmAttachmentBlob,
  sendDirectMessage,
  syncRelayMailbox,
  type StoredDmMessage,
} from "@/lib/relay-workspace";
import { useAuthStore } from "@/lib/store";

function contentClassForMimeType(mimeType: string) {
  if (mimeType.startsWith("video/")) {
    return "video" as const;
  }

  if (mimeType.startsWith("audio/")) {
    return "audio" as const;
  }

  if (!mimeType.startsWith("image/")) {
    return "file" as const;
  }

  return "image" as const;
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuthStore();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupThreadMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<StoredDmMessage[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function loadRelayHostedMessages(conversationId: string) {
    try {
      setGroupMessages(await relayConversationApi.listMessages(conversationId, 80));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load conversation messages");
    }
  }

  async function loadDmMessages(conversationId: string) {
    try {
      await ensureWorkspaceReady();
      await syncRelayMailbox();
      setDmMessages(listStoredDmMessages(conversationId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync DM history");
    }
  }

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      try {
        const data = await relayConversationApi.get(id);
        if (!cancelled) {
          setConversation(data);
        }
      } catch {
        if (!cancelled) {
          router.push("/app");
        }
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (!conversation) {
      return;
    }

    if (conversation.kind === "community") {
      router.replace(`/app/community/${conversation.id}`);
      return;
    }

    if (conversation.kind === "group" || conversation.kind === "room") {
      void loadRelayHostedMessages(conversation.id);
      const intervalId = window.setInterval(() => {
        void loadRelayHostedMessages(conversation.id);
      }, 10000);

      return () => {
        window.clearInterval(intervalId);
      };
    }

    void loadDmMessages(conversation.id);
    const intervalId = window.setInterval(() => {
      void loadDmMessages(conversation.id);
    }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [conversation, router]);

  async function uploadGroupAttachment(file: File) {
    const ticket = await relayAttachmentApi.createTicket({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      byteLength: file.size,
      conversationId: id,
      conversationEpoch: conversation?.epoch,
      contentClass: contentClassForMimeType(file.type),
      retentionMode: "private_vault",
      protectionProfile: "standard",
    });
    const bytes = await file.arrayBuffer();
    await uploadAttachment(ticket.uploadUrl, bytes, file.type || "application/octet-stream");
    return ticket.attachmentId;
  }

  async function handleSend(event?: React.FormEvent) {
    event?.preventDefault();
    if (!conversation) {
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent && !selectedFile) {
      return;
    }

    setIsSending(true);
    try {
      if (conversation.kind === "group" || conversation.kind === "room") {
        const attachmentId = selectedFile ? await uploadGroupAttachment(selectedFile) : undefined;
        await relayConversationApi.sendMessage(conversation.id, {
          text: trimmedContent || undefined,
          attachmentId,
          clientMessageId: crypto.randomUUID(),
        });
        await loadRelayHostedMessages(conversation.id);
      } else {
        await sendDirectMessage({
          conversation,
          senderDisplayName: user?.displayName ?? user?.username ?? "Web user",
          text: trimmedContent,
          file: selectedFile,
        });
        await loadDmMessages(conversation.id);
      }

      setContent("");
      setSelectedFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send the message");
    } finally {
      setIsSending(false);
    }
  }

  async function handleDownloadDmAttachment(message: StoredDmMessage) {
    if (!message.attachment) {
      return;
    }

    try {
      const blob = await readDmAttachmentBlob(message.attachment);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = message.attachment.fileName;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download the attachment");
    }
  }

  const peer =
    conversation?.kind === "direct_message"
      ? conversation.members.find((member) => member.accountId !== user?.id)
      : null;
  const conversationName =
    conversation?.kind === "direct_message"
      ? peer?.displayName ?? conversation?.title ?? "Direct message"
      : conversation?.title ??
        (conversation?.kind === "room" ? "Room" : conversation?.kind === "community" ? "Community" : "Group");
  const trustLabel =
    conversation?.historyMode === "device_encrypted"
      ? "Mailbox delivery with local browser history"
      : conversation?.kind === "room"
        ? "Relay-hosted room history"
        : "Relay-hosted group history";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-start gap-3 border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
        <Avatar name={conversationName} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-[var(--text-primary)]">{conversationName}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{trustLabel}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Browser history stays local. The relay keeps metadata and mailbox delivery moving.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : conversation?.kind === "group" || conversation?.kind === "room" ? (
          groupMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[var(--text-secondary)]">
                No {conversation.kind === "room" ? "room" : "group"} messages yet.
              </p>
            </div>
          ) : (
            groupMessages.map((message) => {
              const isOwn = message.senderAccountId === user?.id;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[80%] rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                      {isOwn ? "You" : message.senderDisplayName}
                    </p>
                    {message.text ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{message.text}</p>
                    ) : null}
                    {message.attachment ? (
                      <a
                        href={message.attachment.downloadUrl}
                        className="mt-3 inline-flex rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-brand-600"
                      >
                        Download {message.attachment.fileName}
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          )
        ) : dmMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[var(--text-secondary)]">No DM history on this browser yet.</p>
          </div>
        ) : (
          dmMessages.map((message) => {
            const isOwn = message.senderAccountId === user?.id;

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[80%] rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                    {isOwn ? "You" : message.senderDisplayName}
                  </p>
                  {message.text ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{message.text}</p>
                  ) : null}
                  {message.attachment ? (
                    <button
                      type="button"
                      onClick={() => void handleDownloadDmAttachment(message)}
                      className="mt-3 inline-flex rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-brand-600"
                    >
                      Download {message.attachment.fileName}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-[var(--border)] bg-[var(--bg-primary)] p-4">
        <div className="space-y-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="input min-h-[96px] resize-none"
            placeholder={
              conversation?.kind === "direct_message"
                ? "Write a direct message for relay mailbox delivery…"
                : conversation?.kind === "room"
                  ? "Post to the room…"
                  : "Post to the group…"
            }
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-ghost cursor-pointer">
              Attach file
              <input
                type="file"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {selectedFile ? (
              <span className="text-sm text-[var(--text-secondary)]">{selectedFile.name}</span>
            ) : null}
            <button type="submit" className="btn-primary" disabled={isSending}>
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
