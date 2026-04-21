"use client";

import {
  BarChart3,
  Bold,
  Camera,
  CheckSquare,
  Code2,
  EyeOff,
  Italic,
  Link2,
  MapPin,
  Paperclip,
  Quote,
  SendHorizontal,
  ShieldCheck,
  Strikethrough,
  Users,
  X,
} from "lucide-react";
import type {
  ConversationDetail,
  ConversationInviteDescriptor,
  ConversationMemberSummary,
  GroupThreadMessage,
} from "@emberchamber/protocol";
import NextImage from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { Avatar } from "@/components/avatar";
import { CopyButton } from "@/components/copy-button";
import { FormattedMessage } from "@/components/formatted-message";
import { StatusCallout } from "@/components/status-callout";
import { useCompanionShell } from "@/components/companion-shell";
import {
  applyDraftFormatting,
  insertDraftSnippet,
  normalizeDraftSelection,
  type DraftFormatAction,
  type DraftSelection,
} from "@/lib/message-draft-formatting";
import {
  ensureRelayAccessToken,
  getRelayWebsocketUrl,
  RelayRequestError,
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
import { calcReconnectDelayMs } from "@/lib/backoff";

type ConversationLoadError = {
  title: string;
  message: string;
};

type SidePanel = "people" | "invite" | null;

type ThreadAttachment =
  | NonNullable<StoredDmMessage["attachment"]>
  | NonNullable<GroupThreadMessage["attachment"]>;

type ThreadMessage = {
  id: string;
  senderAccountId: string;
  senderDisplayName: string;
  text?: string | null;
  attachment?: ThreadAttachment | null;
  createdAt: string;
  kind: "text" | "media" | "system_notice";
  status?: StoredDmMessage["status"];
  isOwn: boolean;
  deliveryLabel?: string;
};

type ConversationRow =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; message: ThreadMessage };

const composerActions: Array<{
  id: DraftFormatAction;
  label: string;
  icon: typeof Bold;
}> = [
  { id: "bold", label: "Bold", icon: Bold },
  { id: "italic", label: "Italic", icon: Italic },
  { id: "strikethrough", label: "Strike", icon: Strikethrough },
  { id: "code", label: "Code", icon: Code2 },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "spoiler", label: "Spoiler", icon: EyeOff },
] as const;

const inviteDefaults = {
  maxUses: "6",
  expiresInHours: "72",
  note: "",
};

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

function formatConversationDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatJoinDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildConversationRows(messages: ThreadMessage[]): ConversationRow[] {
  const rows: ConversationRow[] = [];
  let activeDate = "";

  for (const message of messages) {
    const messageDate = message.createdAt.slice(0, 10);
    if (messageDate !== activeDate) {
      activeDate = messageDate;
      rows.push({
        type: "date",
        key: `date-${messageDate}`,
        label: formatConversationDate(message.createdAt),
      });
    }

    rows.push({
      type: "message",
      key: message.id,
      message,
    });
  }

  return rows;
}

function describeConversationLoadError(error: unknown): ConversationLoadError {
  if (error instanceof RelayRequestError) {
    if (error.status === 404) {
      return {
        title: "Conversation not found",
        message:
          "This chat link is stale, or the conversation is no longer available on this account.",
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        title: "Access to this conversation is unavailable",
        message:
          "Your browser session does not currently have access to this chat. Sign in again or ask an organizer to restore access.",
      };
    }
  }

  return {
    title: "Conversation failed to load",
    message:
      error instanceof Error
        ? error.message
        : "The relay did not return this conversation yet. Try again in a moment.",
  };
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuthStore();
  const { mailboxRevision } = useCompanionShell();
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  );
  const [groupMessages, setGroupMessages] = useState<GroupThreadMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<StoredDmMessage[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<
    string | null
  >(null);
  const [loadError, setLoadError] = useState<ConversationLoadError | null>(
    null,
  );
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState(inviteDefaults);
  const [createdInvite, setCreatedInvite] =
    useState<ConversationInviteDescriptor | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [draftSelection, setDraftSelection] = useState<DraftSelection>({
    start: 0,
    end: 0,
  });
  const [selectionOverride, setSelectionOverride] =
    useState<DraftSelection | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  const loadRelayHostedMessages = useCallback(async (conversationId: string) => {
    try {
      const messages = await relayConversationApi.listMessages(conversationId, 80);
      setGroupMessages(
        messages
          .slice()
          .sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime(),
          ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load conversation messages",
      );
    }
  }, []);

  const loadEncryptedConversationMessages = useCallback(
    async (
      conversationId: string,
      options: { syncWorkspace?: boolean } = {},
    ) => {
      const { syncWorkspace = false } = options;

      try {
        if (syncWorkspace) {
          await ensureWorkspaceReady();
        }

        setDmMessages(await listStoredConversationMessages(conversationId));
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to sync encrypted conversation history",
        );
      }
    },
    [],
  );

  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    setLoadError(null);
    setConversation(null);
    setGroupMessages([]);
    setDmMessages([]);

    try {
      const nextConversation = await relayConversationApi.get(conversationId);
      setConversation(nextConversation);
    } catch (error) {
      setLoadError(describeConversationLoadError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    void loadConversation(id);
  }, [id, loadConversation]);

  useEffect(() => {
    setSelectedMemberId(null);
    setSidePanel(null);
    setCreatedInvite(null);
    setInviteForm(inviteDefaults);
  }, [conversation?.id]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setSelectedFilePreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return previewUrl;
    });

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!conversation) {
      return;
    }

    if (conversation.kind === "community") {
      router.replace(`/app/community/${conversation.id}`);
      return;
    }

    if (conversation.historyMode !== "relay_hosted") {
      return;
    }

    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempt = 0;

    void loadRelayHostedMessages(conversation.id);

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const connectConversationSocket = async () => {
      try {
        const session = await ensureRelayAccessToken();
        if (cancelled || !session?.accessToken) {
          return;
        }

        const wsUrl = `${getRelayWebsocketUrl()}/v1/conversations/${conversation.id}/ws?token=${session.accessToken}`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          reconnectAttempt = 0;
        };
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as GroupThreadMessage;
            setGroupMessages((current) => {
              if (current.some((entry) => entry.id === message.id)) {
                return current;
              }

              return [...current, message].sort(
                (left, right) =>
                  new Date(left.createdAt).getTime() -
                  new Date(right.createdAt).getTime(),
              );
            });
          } catch {
            // Ignore malformed websocket payloads.
          }
        };
        ws.onclose = () => {
          if (cancelled) {
            return;
          }

          clearReconnectTimer();
          reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null;
            void connectConversationSocket();
          }, calcReconnectDelayMs(reconnectAttempt));
          reconnectAttempt += 1;
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (cancelled) {
          return;
        }

        clearReconnectTimer();
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = null;
          void connectConversationSocket();
        }, calcReconnectDelayMs(reconnectAttempt));
        reconnectAttempt += 1;
      }
    };

    void connectConversationSocket();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      ws?.close();
    };
  }, [conversation, loadRelayHostedMessages, router]);

  useEffect(() => {
    if (!conversation || conversation.historyMode !== "device_encrypted") {
      return;
    }

    void loadEncryptedConversationMessages(conversation.id, {
      syncWorkspace: true,
    });
  }, [conversation, loadEncryptedConversationMessages]);

  useEffect(() => {
    if (!conversation || conversation.historyMode !== "device_encrypted") {
      return;
    }

    if (mailboxRevision === 0) {
      return;
    }

    void loadEncryptedConversationMessages(conversation.id);
  }, [conversation, mailboxRevision, loadEncryptedConversationMessages]);

  useEffect(() => {
    if (!selectionOverride) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
      messageInputRef.current?.setSelectionRange(
        selectionOverride.start,
        selectionOverride.end,
      );
      setSelectionOverride(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectionOverride]);

  const threadMessages = useMemo<ThreadMessage[]>(() => {
    if (!conversation) {
      return [];
    }

    if (conversation.historyMode === "device_encrypted") {
      return dmMessages.map((message) => ({
        id: message.id,
        senderAccountId: message.senderAccountId,
        senderDisplayName: message.senderDisplayName,
        text: message.text,
        attachment: message.attachment ?? null,
        createdAt: message.createdAt,
        kind: message.attachment ? "media" : "text",
        status: message.status,
        isOwn: message.senderAccountId === user?.id,
        deliveryLabel:
          message.status === "sent"
            ? "Sent"
            : message.status === "received"
              ? "Received"
              : message.status === "failed"
                ? "Failed"
                : "Pending",
      }));
    }

    return groupMessages.map((message) => ({
      id: message.id,
      senderAccountId: message.senderAccountId,
      senderDisplayName: message.senderDisplayName,
      text: message.text,
      attachment: message.attachment ?? null,
      createdAt: message.createdAt,
      kind: message.kind,
      isOwn: message.senderAccountId === user?.id,
      deliveryLabel: message.readByCount
        ? `Seen by ${message.readByCount}`
        : undefined,
    }));
  }, [conversation, dmMessages, groupMessages, user?.id]);

  const threadRows = useMemo(
    () => buildConversationRows(threadMessages),
    [threadMessages],
  );
  const lastThreadMessageId =
    threadMessages[threadMessages.length - 1]?.id ?? null;

  useEffect(() => {
    if (!threadMessages.length) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const list = messageListRef.current;
      if (!list) {
        return;
      }

      list.scrollTo({
        top: list.scrollHeight,
        behavior: threadMessages.length <= 1 ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [lastThreadMessageId, threadMessages.length]);

  const peer =
    conversation?.kind === "direct_message"
      ? conversation.members.find((member) => member.accountId !== user?.id)
      : null;
  const conversationName =
    conversation?.kind === "direct_message"
      ? peer?.displayName ?? conversation.title ?? "Direct message"
      : conversation?.title ??
        (conversation?.kind === "room" ? "Room" : "Group");
  const trustLabel =
    conversation?.historyMode === "device_encrypted"
      ? "Local-first encrypted history on this browser"
      : conversation?.kind === "room"
        ? "Relay-hosted room history"
        : "Relay-hosted conversation history";
  const selectedMember =
    conversation?.members.find((member) => member.accountId === selectedMemberId) ??
    null;
  const selectedMemberRecentMessages = useMemo(
    () =>
      selectedMember
        ? threadMessages
            .filter(
              (message) =>
                message.senderAccountId === selectedMember.accountId &&
                message.kind !== "system_notice",
            )
            .slice(-3)
            .reverse()
        : [],
    [selectedMember, threadMessages],
  );

  useEffect(() => {
    if (!conversation?.members.length) {
      setSelectedMemberId(null);
      return;
    }

    setSelectedMemberId((current) => {
      if (
        current &&
        conversation.members.some((member) => member.accountId === current)
      ) {
        return current;
      }

      return (
        conversation.members.find((member) => member.accountId !== user?.id)
          ?.accountId ?? conversation.members[0]?.accountId ?? null
      );
    });
  }, [conversation?.id, conversation?.members, user?.id]);

  async function compressWebImage(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) {
      return file;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_DIMENSION = 1920;
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          } else {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(
                new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }),
              );
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.82,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  async function uploadRelayAttachment(originalFile: File) {
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

    await uploadAttachment(
      ticket.uploadUrl,
      encrypted.ciphertext,
      "application/octet-stream",
    );

    return ticket.attachmentId;
  }

  function syncDraftSelectionFromInput() {
    const input = messageInputRef.current;
    if (!input) {
      return;
    }

    setDraftSelection(
      normalizeDraftSelection(
        {
          start: input.selectionStart ?? content.length,
          end: input.selectionEnd ?? content.length,
        },
        content.length,
      ),
    );
  }

  function applyComposerResult(result: {
    text: string;
    selection: DraftSelection;
  }) {
    setContent(result.text);
    setDraftSelection(result.selection);
    setSelectionOverride(result.selection);
  }

  function handleFormatting(action: DraftFormatAction) {
    applyComposerResult(applyDraftFormatting(content, draftSelection, action));
  }

  function handleSnippetInsert(snippet: string) {
    applyComposerResult(insertDraftSnippet(content, draftSelection, snippet));
  }

  function insertPollTemplate() {
    handleSnippetInsert(
      '📊 Poll: "Question"\n\n1. First option\n2. Second option',
    );
  }

  function insertChecklistTemplate() {
    handleSnippetInsert(
      '☑️ Checklist: "Title"\n\n☐ First item\n☐ Second item',
    );
  }

  function handleLocationInsert() {
    if (!navigator.geolocation) {
      toast.error("This browser cannot share location from the web app.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);
        handleSnippetInsert(
          `📍 Current location\n\n${latitude.toFixed(5)}, ${longitude.toFixed(5)}\nhttps://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}\nAccuracy: ${accuracy} m`,
        );
        setIsLocating(false);
      },
      () => {
        toast.error("Location access was blocked.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
      },
    );
  }

  async function handleSend(event?: React.FormEvent) {
    event?.preventDefault();
    if (!conversation || conversation.kind === "community") {
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
          senderDisplayName:
            user?.displayName ?? user?.username ?? "Web workspace",
          text: trimmedContent,
          file: selectedFile,
        });
        await loadEncryptedConversationMessages(conversation.id);
      } else {
        const attachmentId = selectedFile
          ? await uploadRelayAttachment(selectedFile)
          : undefined;
        await relayConversationApi.sendMessage(conversation.id, {
          text: trimmedContent || undefined,
          attachmentId,
          clientMessageId: crypto.randomUUID(),
        });
        await loadRelayHostedMessages(conversation.id);
      }

      setContent("");
      setSelectedFile(null);
      setDraftSelection({ start: 0, end: 0 });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send the message",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleDownloadAttachment(message: ThreadMessage) {
    if (!message.attachment) {
      return;
    }

    try {
      const blob =
        conversation?.historyMode === "device_encrypted"
          ? await readDmAttachmentBlob(
              message.attachment as NonNullable<StoredDmMessage["attachment"]>,
            )
          : await readRelayAttachmentBlob(
              message.attachment as NonNullable<GroupThreadMessage["attachment"]>,
            );
      downloadBlob(blob, message.attachment.fileName);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to download the attachment",
      );
    }
  }

  async function handleOpenDm(member: ConversationMemberSummary) {
    try {
      const dm = await relayConversationApi.openDm(member.accountId);
      router.push(`/app/chat/${dm.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open DM");
    }
  }

  async function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation?.capabilities.canCreateInvites) {
      return;
    }

    setIsCreatingInvite(true);
    try {
      const invite = await relayConversationApi.createInvite(conversation.id, {
        maxUses: inviteForm.maxUses.trim()
          ? Number(inviteForm.maxUses)
          : undefined,
        expiresInHours: inviteForm.expiresInHours.trim()
          ? Number(inviteForm.expiresInHours)
          : undefined,
        note: inviteForm.note.trim() || undefined,
      });
      setCreatedInvite(invite);
      toast.success("Invite ready");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create invite",
      );
    } finally {
      setIsCreatingInvite(false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <StatusCallout
          tone="error"
          title={loadError.title}
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => void loadConversation(id)}
              >
                Try again
              </button>
              <Link href="/app" className="btn-ghost">
                Back to overview
              </Link>
            </div>
          }
        >
          {loadError.message}
        </StatusCallout>
        <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-5 text-sm leading-6 text-[var(--text-secondary)]">
          Keep this route open if you are checking whether access changed. The
          retry action will re-fetch the same conversation id instead of
          dropping you back to overview.
        </div>
      </div>
    );
  }

  const emptyStateLabel =
    conversation?.historyMode === "device_encrypted"
      ? "No local encrypted history on this browser yet."
      : conversation?.kind === "room"
        ? "No room messages yet."
        : "No messages yet.";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar name={conversationName} size="sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">
                  {conversationName}
                </h2>
                <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-600">
                  {conversation?.kind === "direct_message"
                    ? "DM"
                    : conversation?.kind === "room"
                      ? "Room"
                      : "Group"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1">
                  {conversation?.memberCount ?? 0} members
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1">
                  {trustLabel}
                </span>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1">
                  Relay delivery, device-held keys
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setSidePanel((current) =>
                  current === "people" ? null : "people",
                )
              }
              className={clsx(
                "btn-ghost",
                sidePanel === "people" && "border-brand-500/50 text-brand-600",
              )}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              People
            </button>
            {conversation?.capabilities.canCreateInvites ? (
              <button
                type="button"
                onClick={() =>
                  setSidePanel((current) =>
                    current === "invite" ? null : "invite",
                  )
                }
                className={clsx(
                  "btn-ghost",
                  sidePanel === "invite" &&
                    "border-brand-500/50 text-brand-600",
                )}
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Invite
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={clsx(
          "grid min-h-0 flex-1",
          sidePanel
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]"
            : "lg:grid-cols-[minmax(0,1fr)]",
        )}
      >
        <section className="flex min-h-0 flex-col">
          <div
            ref={messageListRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
          >
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : threadRows.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md rounded-[1.6rem] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-8 text-center">
                  <p className="text-base font-semibold text-[var(--text-primary)]">
                    No history yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {emptyStateLabel}
                  </p>
                </div>
              </div>
            ) : (
              threadRows.map((row) =>
                row.type === "date" ? (
                  <div
                    key={row.key}
                    className="flex items-center gap-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]"
                  >
                    <div className="h-px flex-1 bg-[var(--border)]" />
                    <span>{row.label}</span>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                ) : (
                  <div
                    key={row.key}
                    className={clsx(
                      "flex",
                      row.message.isOwn ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={clsx(
                        "max-w-[min(82%,46rem)] rounded-[1.55rem] border px-4 py-3 shadow-[0_10px_24px_rgba(32,19,18,0.06)]",
                        row.message.kind === "system_notice"
                          ? "border-brand-500/35 bg-brand-500/[0.08]"
                          : row.message.isOwn
                            ? "border-brand-500/35 bg-brand-500/[0.09]"
                            : "border-[var(--border)] bg-[var(--bg-secondary)]",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                          {row.message.isOwn
                            ? "You"
                            : row.message.senderDisplayName}
                        </p>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {formatMessageTime(row.message.createdAt)}
                        </span>
                        {row.message.deliveryLabel ? (
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            {row.message.deliveryLabel}
                          </span>
                        ) : null}
                      </div>

                      {row.message.text ? (
                        <FormattedMessage text={row.message.text} />
                      ) : null}

                      {row.message.attachment ? (
                        <button
                          type="button"
                          onClick={() => void handleDownloadAttachment(row.message)}
                          className="mt-3 flex w-full items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 text-left transition-colors hover:border-brand-500"
                        >
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {row.message.attachment.fileName}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                              {row.message.attachment.contentClass} ·{" "}
                              {formatBytes(
                                row.message.attachment.byteLength ?? 0,
                              )}
                            </p>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                            Download
                          </span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ),
              )
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 sm:px-6"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {composerActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleFormatting(action.id)}
                      className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {action.label}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={insertPollTemplate}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Poll
                  </span>
                </button>
                <button
                  type="button"
                  onClick={insertChecklistTemplate}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    Checklist
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleLocationInsert}
                  disabled={isLocating}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {isLocating ? "Locating" : "Location"}
                  </span>
                </button>
              </div>

              {selectedFile ? (
                <div className="rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        {selectedFile.type || "application/octet-stream"} ·{" "}
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600"
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {selectedFilePreviewUrl ? (
                    <NextImage
                      src={selectedFilePreviewUrl}
                      alt="Selected upload preview"
                      width={1200}
                      height={800}
                      unoptimized
                      className="mt-4 max-h-56 w-full rounded-[1.25rem] object-cover"
                    />
                  ) : null}
                </div>
              ) : null}

              <textarea
                ref={messageInputRef}
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  syncDraftSelectionFromInput();
                }}
                onClick={syncDraftSelectionFromInput}
                onKeyUp={syncDraftSelectionFromInput}
                onSelect={syncDraftSelectionFromInput}
                spellCheck
                className="input min-h-[132px] resize-none"
                placeholder={
                  conversation?.kind === "direct_message"
                    ? "Write a direct message for relay mailbox delivery…"
                    : conversation?.historyMode === "device_encrypted"
                      ? "Write to the encrypted conversation…"
                      : "Write to the relay-hosted conversation…"
                }
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-ghost cursor-pointer">
                  <Paperclip className="h-4 w-4" aria-hidden="true" />
                  Attach
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
                <label className="btn-ghost cursor-pointer">
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  Camera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
                <div className="ml-auto flex items-center gap-3">
                  <p className="hidden text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] sm:block">
                    {conversation?.historyMode === "device_encrypted"
                      ? "Browser stores decrypted history locally."
                      : "Relay stores this history until migration."}
                  </p>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSending}
                  >
                    <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                    {isSending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>

        {sidePanel ? (
          <aside className="border-t border-[var(--border)] bg-[var(--bg-secondary)] lg:border-l lg:border-t-0">
            {sidePanel === "people" ? (
              <div className="flex h-full flex-col p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                      People
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                      Members in this conversation
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidePanel(null)}
                    className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600"
                    aria-label="Close people panel"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {conversation?.members.map((member) => (
                    <button
                      key={member.accountId}
                      type="button"
                      onClick={() => setSelectedMemberId(member.accountId)}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-[1.2rem] border px-3 py-3 text-left transition-colors",
                        selectedMember?.accountId === member.accountId
                          ? "border-brand-500/45 bg-brand-500/[0.08]"
                          : "border-[var(--border)] bg-[var(--bg-primary)]",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {member.displayName}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          {member.role}
                          {member.accountId === user?.id ? " · you" : ""}
                        </p>
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Joined {formatJoinDate(member.joinedAt)}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedMember ? (
                  <div className="mt-5 rounded-[1.45rem] border border-[var(--border)] bg-[var(--bg-primary)] p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={selectedMember.displayName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                          {selectedMember.displayName}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          @{selectedMember.username}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          {selectedMember.role} · joined{" "}
                          {formatJoinDate(selectedMember.joinedAt)}
                        </p>
                      </div>
                    </div>

                    {selectedMemberRecentMessages.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                          Recent in this chat
                        </p>
                        <div className="mt-3 space-y-2">
                          {selectedMemberRecentMessages.map((message) => (
                            <div
                              key={message.id}
                              className="rounded-[1.15rem] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-3"
                            >
                              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                                {formatMessageTime(message.createdAt)}
                              </p>
                              {message.text ? (
                                <FormattedMessage
                                  text={message.text}
                                  className="mt-2 space-y-2"
                                />
                              ) : (
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                  Shared an attachment.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedMember.accountId !== user?.id ? (
                      <button
                        type="button"
                        onClick={() => void handleOpenDm(selectedMember)}
                        className="btn-primary mt-4 w-full"
                      >
                        Start DM
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-full flex-col p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
                      Invite
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                      Mint a deliberate access link
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidePanel(null)}
                    className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-brand-500 hover:text-brand-600"
                    aria-label="Close invite panel"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {conversation?.capabilities.canCreateInvites ? (
                  <>
                    <p className="mt-3 rounded-[1.2rem] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                      Keep the beta boundary intentional. Give the link a short
                      lifetime, limit uses, and add a note when context matters.
                    </p>

                    <form
                      onSubmit={handleCreateInvite}
                      className="mt-4 space-y-4"
                    >
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            Max uses
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={inviteForm.maxUses}
                            onChange={(event) =>
                              setInviteForm((current) => ({
                                ...current,
                                maxUses: event.target.value,
                              }))
                            }
                            className="input"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            Expires in hours
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={168}
                            value={inviteForm.expiresInHours}
                            onChange={(event) =>
                              setInviteForm((current) => ({
                                ...current,
                                expiresInHours: event.target.value,
                              }))
                            }
                            className="input"
                          />
                        </label>
                      </div>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          Invite note
                        </span>
                        <textarea
                          value={inviteForm.note}
                          onChange={(event) =>
                            setInviteForm((current) => ({
                              ...current,
                              note: event.target.value,
                            }))
                          }
                          className="input min-h-[112px] resize-none"
                          placeholder="Optional context that shows during invite preview."
                        />
                      </label>

                      <button
                        type="submit"
                        className="btn-primary w-full"
                        disabled={isCreatingInvite}
                      >
                        <Link2 className="h-4 w-4" aria-hidden="true" />
                        {isCreatingInvite ? "Creating…" : "Create invite"}
                      </button>
                    </form>

                    {createdInvite ? (
                      <div className="mt-5 rounded-[1.45rem] border border-brand-500/35 bg-brand-500/[0.08] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                          <ShieldCheck
                            className="h-4 w-4 text-brand-600"
                            aria-hidden="true"
                          />
                          Invite ready
                        </div>
                        <p className="mt-2 break-all text-sm leading-6 text-[var(--text-secondary)]">
                          {createdInvite.inviteUrl}
                        </p>
                        <div className="mt-4">
                          <CopyButton
                            value={createdInvite.inviteUrl}
                            label="Copy invite"
                            successMessage="Invite copied"
                          />
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="mt-4 rounded-[1.35rem] border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                    This conversation does not currently allow this account to
                    mint new invites.
                  </div>
                )}
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
