// ─── Identifiers ────────────────────────────────────────────────────────────

/** Opaque UUID string for a EmberChamber user. */
export type UserId = string;
/** Opaque UUID string for a device belonging to a user. */
export type DeviceId = string;
/** Opaque UUID string for an operator node. */
export type NodeId = string;
/** Opaque UUID string for a conversation (DM, group, or channel). */
export type ConversationId = string;

// ─── Enums ──────────────────────────────────────────────────────────────────

export type ConversationKind = "direct_message" | "group" | "channel";

export type MemberRole = "owner" | "admin" | "mod" | "member";

export type NotificationPreviewMode = "discreet" | "expanded" | "none";
export type ContentClass = "image" | "video" | "audio" | "file";
export type RetentionMode = "private_vault" | "ephemeral";
export type ProtectionProfile = "sensitive_media" | "standard";

export type ReportReason =
  | "spam"
  | "harassment"
  | "illegal_content"
  | "malware"
  | "csam"
  | "non_consensual_intimate_media"
  | "coercion_or_extortion"
  | "impersonation"
  | "underage_risk"
  | "other";

export type ReportStatus = "open" | "under_review" | "resolved" | "dismissed";

// ─── Core entities ──────────────────────────────────────────────────────────

/** A globally unique user handle that maps to a home operator node. */
export interface UserHandle {
  userId: UserId;
  username: string;
  homeNodeId: NodeId;
  displayName?: string;
  avatarUrl?: string;
}

/** Device identity including the device's current identity public key. */
export interface DeviceIdentity {
  deviceId: DeviceId;
  userId: UserId;
  deviceLabel: string;
  identityKeyB64: string;
  verifiedAt?: string;
  lastSeenAt?: string;
}

// ─── Messages ───────────────────────────────────────────────────────────────

/** An end-to-end encrypted DM envelope addressed to one device. */
export interface MessageEnvelope {
  id: string;
  conversationId: ConversationId;
  senderUserId: UserId;
  senderDeviceId: DeviceId;
  recipientDeviceId: DeviceId;
  /** Base64url-encoded ciphertext. */
  ciphertextB64: string;
  replyToId?: string;
  createdAt: string;
}

/** A server-managed (non-E2EE) message body for groups and channels. */
export interface HostedMessageBody {
  id: string;
  conversationId: ConversationId;
  senderUserId: UserId;
  contentType: "text" | "attachment_ref";
  body: string;
  replyToId?: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
}

// ─── Attachments ────────────────────────────────────────────────────────────

export interface AttachmentDescriptor {
  id: string;
  ownerUserId: UserId;
  mime: string;
  sizeBytes: number;
  /** "e2ee" for DM attachments, "server" for hosted-space attachments. */
  encryptionMode: "e2ee" | "server";
  /** SHA-256 hex digest of the plaintext (for dedup/integrity). */
  sha256: string;
  contentClass: ContentClass;
  retentionMode: RetentionMode;
  protectionProfile: ProtectionProfile;
  previewBlurHash?: string;
  createdAt: string;
}

// ─── Privacy ─────────────────────────────────────────────────────────────────

export interface PrivacySettings {
  notificationPreviewMode: NotificationPreviewMode;
  autoDownloadSensitiveMedia: boolean;
  allowSensitiveExport: boolean;
  secureAppSwitcher: boolean;
}

// ─── Safety ──────────────────────────────────────────────────────────────────

export interface ReportSubmission {
  targetType: "message" | "user" | "attachment";
  targetId: string;
  reason: ReportReason;
  /** IDs of specific messages explicitly selected by the reporter. */
  evidenceMessageIds?: string[];
  notes?: string;
}

export interface GroupInviteDescriptor {
  id: string;
  conversationId: ConversationId;
  inviteToken: string;
  inviteUrl: string;
  inviterDisplayName: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  note?: string | null;
  status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
  createdAt: string;
}

export interface GroupInviteRecord {
  id: string;
  conversationId: ConversationId;
  inviterDisplayName: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  note?: string | null;
  status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
  createdAt: string;
  createdByCurrentAccount: boolean;
}

export interface GroupInvitePreview {
  invite: {
    id: string;
    status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
    inviterDisplayName: string;
    expiresAt?: string | null;
    maxUses?: number | null;
    useCount: number;
    note?: string | null;
  };
  group: {
    id: ConversationId;
    title: string;
    memberCount: number;
    memberCap: number;
    joinRuleText?: string | null;
    sensitiveMediaDefault: boolean;
  };
}

export interface GroupMembershipSummary {
  id: ConversationId;
  title: string;
  epoch: number;
  memberCount: number;
  memberCap: number;
  myRole: "owner" | "admin" | "member";
  sensitiveMediaDefault: boolean;
  joinRuleText?: string | null;
  allowMemberInvites: boolean;
  inviteFreezeEnabled: boolean;
  canCreateInvites: boolean;
  canManageMembers: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupThreadMessage {
  id: string;
  conversationId: ConversationId;
  senderAccountId: UserId;
  senderDisplayName: string;
  kind: "text" | "media" | "system_notice";
  text?: string | null;
  attachment?: {
    id: string;
    downloadUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    contentClass: ContentClass;
    retentionMode: RetentionMode;
    protectionProfile: ProtectionProfile;
    previewBlurHash?: string | null;
  } | null;
  createdAt: string;
}

// ─── Federation (relay) ──────────────────────────────────────────────────────

/** Node certificate issued by the EmberChamber CA to an operator. */
export interface NodeCertificate {
  nodeId: NodeId;
  domain: string;
  certPemB64: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  messageId: string;
  conversationId: ConversationId;
  snippet: string;
  createdAt: string;
}

// ─── WebSocket events ────────────────────────────────────────────────────────

export type WebSocketEventType =
  | "conversation.synced"
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "receipt.updated"
  | "typing.started"
  | "typing.stopped"
  | "member.joined"
  | "member.removed"
  | "invite.revoked"
  | "report.status_changed"
  | "session.revoked";

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
}
