"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ConversationDetail, GroupThreadMessage } from "@emberchamber/protocol";
import { Avatar } from "@/components/avatar";
import { useCompanionShell } from "@/components/companion-shell";
import {
  ensureRelayAccessToken,
  getRelayWebsocketUrl,
  relayAttachmentApi,
  relayConversationApi,
  uploadAttachment,
} from "@/lib/relay";
import {
  ensureWorkspaceReady,
  encryptRelayAttachmentFile,
  listStoredConversationMessages,
  readDmAttachmentBlob,
  readRelayAttachmentBlob,
  sendConversationMessage,
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

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuthStore();
  const { mailboxRevision } = useCompanionShell();
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

  async function loadEncryptedConversationMessages(conversationId: string, options: { syncWorkspace?: boolean } = {}) {
    const { syncWorkspace = false } = options;

    try {
      if (syncWorkspace) {
        await ensureWorkspaceReady();
      }
      setDmMessages(await listStoredConversationMessages(conversationId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync encrypted conversation history");
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

    if ((conversation.kind === "group" || conversation.kind === "room") && conversation.historyMode === "relay_hosted") {
      let cancelled = false;
      let ws: WebSocket | null = null;
      let reconnectTimer: number | null = null;

      void loadRelayHostedMessages(conversation.id);

      const clearReconnectTimer = () => {
        if (reconnectTimer !== null) {
          window.clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      const connectGroupSocket = async () => {
        const session = await ensureRelayAccessToken();
        if (cancelled || !session?.accessToken) {
          return;
        }

        const wsUrl = `${getRelayWebsocketUrl()}/v1/conversations/${conversation.id}/ws?token=${session.accessToken}`;
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as GroupThreadMessage;
            setGroupMessages((prev) => {
              if (prev.some((m) => m.id === message.id)) return prev;
              return [message, ...prev].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          } catch {
            // Ignore unparseable messages
          }
        };
        ws.onclose = () => {
          if (!cancelled) {
            clearReconnectTimer();
            reconnectTimer = window.setTimeout(() => {
              reconnectTimer = null;
              void connectGroupSocket();
            }, 1500);
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
      };

      void connectGroupSocket();

      return () => {
        cancelled = true;
        clearReconnectTimer();
        ws?.close();
      };
    }
  }, [conversation, router]);

  useEffect(() => {
    if (!conversation || conversation.historyMode !== "device_encrypted") {
      return;
    }

    void loadEncryptedConversationMessages(conversation.id, { syncWorkspace: true });
  }, [conversation]);

  useEffect(() => {
    if (!conversation || conversation.historyMode !== "device_encrypted") {
      return;
    }

    if (mailboxRevision === 0) {
      return;
    }

    void loadEncryptedConversationMessages(conversation.id);
  }, [conversation, mailboxRevision]);

  async function compressWebImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) return file;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1920;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  async function uploadGroupAttachment(originalFile: File) {
    const file = await compressWebImage(originalFile);
    const encrypted = await encryptRelayAttachmentFile(file);
    const ticket = await relayAttachmentApi.createTicket({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      encryptionMode: "device_encrypted",
      ciphertextByteLength: encrypted.ciphertext.byteLength,
      ciphertextSha256B64: encrypted.ciphertextSha256B64,
      plaintextByteLength: encrypted.plaintext.byteLength,
      plaintextSha256B64: encrypted.plaintextSha256B64,
      fileKeyB64: encrypted.fileKeyB64,
      fileIvB64: encrypted.fileIvB64,
      conversationId: id,
      conversationEpoch: conversation?.epoch,
      contentClass: contentClassForMimeType(file.type),
      retentionMode: "private_vault",
      protectionProfile: "standard",
    });
    await uploadAttachment(ticket.uploadUrl, encrypted.ciphertext, "application/octet-stream");
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
      if (conversation.historyMode === "device_encrypted") {
        await sendConversationMessage({
          conversation,
          senderDisplayName: user?.displayName ?? user?.username ?? "Web user",
          text: trimmedContent,
          file: selectedFile,
        });
        await loadEncryptedConversationMessages(conversation.id);
      } else if (conversation.kind === "group" || conversation.kind === "room") {
        const attachmentId = selectedFile ? await uploadGroupAttachment(selectedFile) : undefined;
        await relayConversationApi.sendMessage(conversation.id, {
          text: trimmedContent || undefined,
          attachmentId,
          clientMessageId: crypto.randomUUID(),
        });
        await loadRelayHostedMessages(conversation.id);
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

  async function handleDownloadGroupAttachment(message: GroupThreadMessage) {
    if (!message.attachment) {
      return;
    }

    try {
      const blob = await readRelayAttachmentBlob(message.attachment);
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
      ? "Local-first history"
      : conversation?.kind === "room"
        ? "Room history via relay"
        : "Group history via relay";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-start gap-3 border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3">
        <Avatar name={conversationName} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-[var(--text-primary)]">{conversationName}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{trustLabel}</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Relay handles delivery. Your private keys remain on your devices.
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : conversation?.historyMode === "device_encrypted" ? (
          dmMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[var(--text-secondary)]">No local encrypted history on this browser yet.</p>
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
                      {isOwn ? "You" : message.senderDisplayName}{isOwn ? "  ✓✓" : ""}
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
          )
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
                      {isOwn ? "You" : message.senderDisplayName}{isOwn ? "  ✓✓" : ""}
                    </p>
                    {message.text ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{message.text}</p>
                    ) : null}
                    {message.attachment ? (
                      <button
                        type="button"
                        onClick={() => void handleDownloadGroupAttachment(message)}
                        className="mt-3 inline-flex rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-brand-600"
                      >
                        Download {message.attachment.fileName}
                      </button>
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
                    {isOwn ? "You" : message.senderDisplayName}{isOwn ? "  ✓✓" : ""}
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
              Attach
              <input
                type="file"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="btn-ghost cursor-pointer">
              Camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {selectedFile ? (
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-sm text-[var(--text-secondary)]">
                {selectedFile.name} · {formatBytes(selectedFile.size)}
              </span>
            ) : null}
            <button type="submit" className="btn-primary ml-auto" disabled={isSending}>
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
