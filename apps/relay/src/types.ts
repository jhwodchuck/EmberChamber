import type {
  ConversationDetail,
  ConversationKind,
  ConversationSummary,
} from "@emberchamber/protocol";

export interface Env {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
  DEVICE_MAILBOX: DurableObjectNamespace;
  GROUP_COORDINATOR: DurableObjectNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  EMAIL_QUEUE: Queue<unknown>;
  PUSH_QUEUE: Queue<unknown>;
  CLEANUP_QUEUE: Queue<unknown>;
  EMBERCHAMBER_RELAY_PUBLIC_URL: string;
  EMBERCHAMBER_WEB_PUBLIC_URL?: string;
  EMBERCHAMBER_EMAIL_PROVIDER: string;
  EMBERCHAMBER_EMAIL_FROM: string;
  EMBERCHAMBER_DEV_INVITE_TOKEN?: string;
  EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET: string;
  EMBERCHAMBER_EMAIL_INDEX_SECRET: string;
  EMBERCHAMBER_ACCESS_TOKEN_SECRET: string;
  EMBERCHAMBER_REFRESH_TOKEN_SECRET: string;
  EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET: string;
  EMBERCHAMBER_ALLOWED_ORIGINS: string;
  EMBERCHAMBER_LOCAL_AUTOCONNECT_MARKER?: string;
  EMBERCHAMBER_ADMIN_SECRET?: string;
  EMBERCHAMBER_PUSH_TOKEN_SECRET?: string;
  EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON?: string;
  EMBERCHAMBER_VAPID_PRIVATE_KEY?: string;
  EMBERCHAMBER_VAPID_PUBLIC_KEY?: string;
  EMBERCHAMBER_VAPID_SUBJECT?: string;
  RESEND_API_KEY?: string;
  PASSKEY_RPID: string;
  PASSKEY_ORIGIN: string;
}

export interface AuthContext {
  accountId: string;
  deviceId: string;
  sessionId: string;
}

export type ClientMetadata = {
  clientPlatform: string | null;
  clientVersion: string | null;
  clientBuild: string | null;
  deviceModel: string | null;
};

export const clientHeaderNames = {
  clientPlatform: "x-emberchamber-client-platform",
  clientVersion: "x-emberchamber-client-version",
  clientBuild: "x-emberchamber-client-build",
  deviceModel: "x-emberchamber-device-model",
} as const;

export type CleanupMessage = {
  type: "cleanup_pulse";
  source: string;
  requestedAt: string;
};

export type MagicLinkMessage = {
  type: "magic_link";
  to: string;
  from: string;
  completionUrl: string;
  expiresAt: string;
};

export type PushWakeMessage = {
  type: "push_wake";
  targetDeviceId: string;
  reason: "mailbox" | "relay_hosted_message";
  conversationId?: string;
  conversationTitle?: string | null;
  senderDisplayName?: string | null;
  historyMode?: "device_encrypted" | "relay_hosted";
  messageKind?: "mailbox" | "text" | "media" | "system_notice";
  sentAt: string;
};

export type RelayQueueMessage = CleanupMessage | MagicLinkMessage | PushWakeMessage;

export type LoadedConversation = {
  summary: ConversationSummary;
  members: NonNullable<ConversationDetail["members"]>;
  myRole: "owner" | "admin" | "member";
  rooms?: ConversationSummary[];
};

export type RelayConversationKind = ConversationKind;

export type DeviceLinkRow = {
  id: string;
  account_id: string;
  requester_label: string;
  qr_mode: "source_display" | "target_display";
  created_at: string;
  expires_at: string;
  claimed_at: string | null;
  approved_at: string | null;
  approved_by_device_id: string | null;
  consumed_at: string | null;
  completed_device_id: string | null;
  completed_session_id: string | null;
};

export type RelayHostedAttachmentRow = {
  attachment_id: string | null;
  file_name: string | null;
  mime_type: string | null;
  byte_length: number | null;
  plaintext_byte_length: number | null;
  content_class: "image" | "video" | "audio" | "file" | null;
  retention_mode: "private_vault" | "ephemeral" | null;
  protection_profile: "sensitive_media" | "standard" | null;
  preview_blur_hash: string | null;
  encryption_mode: "none" | "device_encrypted" | null;
  attachment_key_box: string | null;
  attachment_iv_box: string | null;
};
