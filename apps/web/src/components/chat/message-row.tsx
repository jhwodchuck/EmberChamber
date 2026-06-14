"use client";

import NextImage from "next/image";
import { memo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Copy, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { FormattedMessage } from "@/components/formatted-message";
import { avatarColor, avatarInitial } from "@/lib/avatar-color";
import { ReadTicks } from "./read-ticks";
import { ReactionChip } from "./reaction-chip";
import {
  MessageContextMenu,
  type ContextMenuAction,
} from "./message-context-menu";

export const REACTION_EMOJI = ["👍", "❤️", "😂", "🔥", "🎉", "😮"] as const;

export type ChatRowMessage = {
  id: string;
  senderAccountId: string;
  senderDisplayName: string;
  text?: string | null;
  attachment?: {
    fileName: string;
    contentClass?: string | null;
    byteLength?: number | null;
    mimeType?: string | null;
    downloadUrl?: string | null;
  } | null;
  createdAt: string;
  kind: "text" | "media" | "system_notice";
  isOwn: boolean;
  historyMode?: "relay_hosted" | "device_encrypted";
  deliveryLabel?: string;
  replyTo?: { senderDisplayName?: string | null; text?: string | null } | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  reactions?: Record<string, string[]>;
  readByCount?: number;
};

type MessageRowProps = {
  message: ChatRowMessage;
  selfAccountId: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSenderName: boolean;
  showAvatar: boolean;
  highlighted: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
  onToggleReaction: (emoji: string) => void;
  onDownloadAttachment: () => void;
  onOpenImage: (src: string, alt: string) => void;
};

const BUBBLE_RADIUS = 18;
const TAIL_RADIUS = 5;
const STACK_RADIUS = 7;

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${value} B`;
}

function formatMessageTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const MessageRow = memo(function MessageRow({
  message,
  selfAccountId,
  isFirstInGroup,
  isLastInGroup,
  showSenderName,
  showAvatar,
  highlighted,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onToggleReaction,
  onDownloadAttachment,
  onOpenImage,
}: MessageRowProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const isOwn = message.isOwn;
  const isDeleted = Boolean(message.deletedAt);
  const isRelayHosted = message.historyMode === "relay_hosted";
  const hasText = !isDeleted && Boolean(message.text?.trim());
  const attachment = isDeleted ? null : message.attachment ?? null;
  const isImage =
    attachment?.contentClass === "image" ||
    Boolean(attachment?.mimeType?.startsWith("image/"));
  const imageUrl = attachment?.downloadUrl ?? undefined;
  const reactionEntries = isDeleted
    ? []
    : Object.entries(message.reactions ?? {}).filter(
        ([, accountIds]) => accountIds.length > 0,
      );

  // System notices render as a centered, full-width card (no grouping/avatar).
  if (message.kind === "system_notice") {
    return (
      <div
        id={`message-${message.id}`}
        style={{
          display: "flex",
          justifyContent: "center",
          margin: "0.75rem 0",
          scrollMarginTop: "5rem",
        }}
      >
        <div
          style={{
            maxWidth: "min(34rem, 90%)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            background: "var(--bg-secondary)",
            padding: "0.5rem 0.9rem",
            opacity: 0.85,
          }}
        >
          {message.text ? (
            <FormattedMessage
              text={message.text}
              className="space-y-1 text-center text-xs"
            />
          ) : null}
        </div>
      </div>
    );
  }

  const canReply = isRelayHosted && !isDeleted;
  const canEdit =
    isOwn && isRelayHosted && hasText && !isImage && !isDeleted;
  const canDelete = isOwn && isRelayHosted && !isDeleted;
  const showReactions = isRelayHosted && !isDeleted;

  const actions: ContextMenuAction[] = [];
  if (hasText) {
    actions.push({
      id: "copy",
      label: "Copy text",
      icon: Copy,
      onSelect: () => onCopy(message.text ?? ""),
    });
  }
  if (canReply) {
    actions.push({ id: "reply", label: "Reply", icon: Reply, onSelect: onReply });
  }
  if (canEdit) {
    actions.push({ id: "edit", label: "Edit", icon: Pencil, onSelect: onEdit });
  }
  if (canDelete) {
    actions.push({
      id: "delete",
      label: "Delete",
      icon: Trash2,
      onSelect: onDelete,
      danger: true,
    });
  }

  const quickEmojis = showReactions ? REACTION_EMOJI : [];
  const hasMenu = actions.length > 0 || quickEmojis.length > 0;

  const sideRadius = isOwn
    ? {
        borderTopLeftRadius: BUBBLE_RADIUS,
        borderBottomLeftRadius: BUBBLE_RADIUS,
        borderTopRightRadius: isFirstInGroup ? BUBBLE_RADIUS : STACK_RADIUS,
        borderBottomRightRadius: isLastInGroup ? TAIL_RADIUS : STACK_RADIUS,
      }
    : {
        borderTopRightRadius: BUBBLE_RADIUS,
        borderBottomRightRadius: BUBBLE_RADIUS,
        borderTopLeftRadius: isFirstInGroup ? BUBBLE_RADIUS : STACK_RADIUS,
        borderBottomLeftRadius: isLastInGroup ? TAIL_RADIUS : STACK_RADIUS,
      };

  const openMenuFromButton = () => {
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenu({ x: rect.left, y: rect.bottom + 4 });
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className="ec-message-enter group"
      onContextMenu={(event) => {
        if (!hasMenu) {
          return;
        }
        event.preventDefault();
        setMenu({ x: event.clientX, y: event.clientY });
      }}
      style={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: "0.5rem",
        marginTop: isFirstInGroup ? "0.75rem" : "0.125rem",
        scrollMarginTop: "5rem",
      }}
    >
      {showAvatar && !isOwn ? (
        <div style={{ width: "2rem", flexShrink: 0, alignSelf: "flex-end" }}>
          {isLastInGroup ? (
            <div
              style={{
                height: "2rem",
                width: "2rem",
                borderRadius: "var(--radius-full)",
                background: avatarColor(message.senderAccountId),
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {avatarInitial(message.senderDisplayName)}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ position: "relative", maxWidth: "min(32rem, 82%)", minWidth: 0 }}>
        {showSenderName && !isOwn && !isDeleted ? (
          <span
            style={{
              display: "block",
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: avatarColor(message.senderAccountId),
              paddingLeft: "0.4rem",
              marginBottom: "0.2rem",
            }}
          >
            {message.senderDisplayName}
          </span>
        ) : null}

        <div
          className={clsx(isOwn && "ec-bubble-own")}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            wordBreak: "break-word",
            color: isOwn ? "var(--on-brand)" : "var(--text-primary)",
            background: isOwn
              ? "linear-gradient(135deg, var(--ember-500), var(--ember-600))"
              : "var(--bg-secondary)",
            border: isOwn ? "none" : "1px solid var(--border)",
            boxShadow: highlighted
              ? "0 0 0 2px rgba(234,111,63,0.55)"
              : isOwn
                ? "var(--glow-ember)"
                : "none",
            transition: "box-shadow var(--dur-base) var(--ease-out)",
            ...sideRadius,
          }}
        >
          {isDeleted ? (
            <p
              style={{
                fontStyle: "italic",
                color: isOwn ? "rgba(255,255,255,0.7)" : "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Message deleted
            </p>
          ) : null}

          {!isDeleted && message.replyTo ? (
            <div
              style={{
                marginBottom: "0.4rem",
                paddingLeft: "0.6rem",
                paddingBlock: "0.3rem",
                borderLeft: `2px solid ${isOwn ? "rgba(255,255,255,0.6)" : "var(--ember-500)"}`,
                background: "rgba(0,0,0,0.14)",
                borderRadius: "0 0.4rem 0.4rem 0",
              }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: isOwn ? "rgba(255,255,255,0.85)" : "var(--ember-400)",
                }}
              >
                {message.replyTo.senderDisplayName || "Message"}
              </p>
              <p
                style={{
                  marginTop: "0.1rem",
                  fontSize: "0.75rem",
                  color: isOwn ? "rgba(255,255,255,0.8)" : "var(--text-secondary)",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {message.replyTo.text || "Attachment"}
              </p>
            </div>
          ) : null}

          {hasText ? (
            <FormattedMessage text={message.text ?? ""} className="space-y-2" />
          ) : null}

          {isImage && imageUrl ? (
            <button
              type="button"
              onClick={() => onOpenImage(imageUrl, attachment?.fileName ?? "image")}
              style={{
                display: "block",
                marginTop: hasText ? "0.5rem" : 0,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "zoom-in",
              }}
              aria-label={`Open ${attachment?.fileName ?? "image"}`}
            >
              <NextImage
                src={imageUrl}
                alt={attachment?.fileName ?? "image"}
                width={640}
                height={420}
                unoptimized
                style={{
                  maxHeight: "18rem",
                  width: "auto",
                  maxWidth: "100%",
                  borderRadius: "0.75rem",
                  objectFit: "cover",
                }}
              />
            </button>
          ) : null}

          {attachment && !isImage ? (
            <button
              type="button"
              onClick={onDownloadAttachment}
              style={{
                marginTop: hasText ? "0.6rem" : 0,
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                background: "rgba(0,0,0,0.15)",
                padding: "0.6rem 0.75rem",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: isOwn ? "#fff" : "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.fileName}
                </span>
                <span
                  style={{
                    marginTop: "0.2rem",
                    display: "block",
                    fontSize: "0.6875rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: isOwn ? "rgba(255,255,255,0.75)" : "var(--text-muted)",
                  }}
                >
                  {attachment.contentClass ?? "file"} ·{" "}
                  {formatBytes(attachment.byteLength ?? 0)}
                </span>
              </span>
              <span
                style={{
                  flexShrink: 0,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: isOwn ? "#fff" : "var(--ember-400)",
                }}
              >
                Download
              </span>
            </button>
          ) : null}

          {showReactions && reactionEntries.length ? (
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.35rem",
              }}
            >
              {reactionEntries.map(([emoji, accountIds]) => (
                <ReactionChip
                  key={`${emoji}-${accountIds.length}`}
                  emoji={emoji}
                  count={accountIds.length}
                  active={accountIds.includes(selfAccountId)}
                  onToggle={() => onToggleReaction(emoji)}
                />
              ))}
            </div>
          ) : null}

          <div
            style={{
              marginTop: "0.3rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.35rem",
              fontSize: "0.625rem",
              color: isOwn ? "rgba(255,255,255,0.72)" : "var(--text-muted)",
            }}
          >
            {message.deliveryLabel ? <span>{message.deliveryLabel}</span> : null}
            {message.editedAt && !isDeleted ? (
              <span style={{ fontStyle: "italic" }}>edited</span>
            ) : null}
            <span>{formatMessageTime(message.createdAt)}</span>
            {isOwn && !isDeleted ? (
              <ReadTicks read={(message.readByCount ?? 0) >= 1} />
            ) : null}
          </div>
        </div>

        {hasMenu ? (
          <button
            ref={menuButtonRef}
            type="button"
            onClick={openMenuFromButton}
            aria-label="Message actions"
            className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
            style={{
              position: "absolute",
              top: 0,
              ...(isOwn ? { left: 0 } : { right: 0 }),
              transform: isOwn ? "translateX(-125%)" : "translateX(125%)",
              height: "1.75rem",
              width: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {menu ? (
        <MessageContextMenu
          x={menu.x}
          y={menu.y}
          emojis={quickEmojis}
          onReact={onToggleReaction}
          actions={actions}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  );
});
