export type AccountId = string;
export type DeviceId = string;
export type ConversationId = string;
export type SessionId = string;
export type GroupEpoch = number;
export type ContentClass = "image" | "video" | "audio" | "file";
export type RetentionMode = "private_vault" | "ephemeral";
export type ProtectionProfile = "sensitive_media" | "standard";
export type NotificationPreviewMode = "discreet" | "expanded" | "none";
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

export interface MagicLinkChallenge {
  id: string;
  expiresAt: string;
  inviteRequired: boolean;
  debugCompletionToken?: string;
}

export interface AuthSession {
  accountId: AccountId;
  deviceId: DeviceId;
  sessionId: SessionId;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  passkeyEnrollmentSuggested: boolean;
  bootstrapConversationId?: ConversationId;
  bootstrapConversationTitle?: string;
}

export interface PasskeyCredentialRef {
  credentialId: string;
  transports: string[];
  createdAt: string;
}

export interface ContactCard {
  accountId: AccountId;
  label: string;
  conversationHint?: string;
}

export interface PrekeyBundle {
  identityKeyB64: string;
  signedPrekeyB64: string;
  signedPrekeySignatureB64: string;
  oneTimePrekeysB64: string[];
}

export interface DeviceKeyBundle {
  accountId: AccountId;
  deviceId: DeviceId;
  deviceLabel: string;
  bundle: PrekeyBundle;
  uploadedAt: string;
}

export interface CipherEnvelope {
  envelopeId: string;
  conversationId: ConversationId;
  epoch: GroupEpoch;
  senderAccountId: AccountId;
  senderDeviceId: DeviceId;
  recipientDeviceId: DeviceId;
  ciphertext: string;
  attachmentIds: string[];
  clientMessageId: string;
  createdAt: string;
  expiresAt: string;
}

export interface EnvelopeBatch {
  conversationId: ConversationId;
  envelopes: CipherEnvelope[];
}

export interface MailboxCursor {
  lastSeenEnvelopeId?: string;
}

export interface MailboxAck {
  envelopeIds: string[];
}

export interface AttachmentTicket {
  attachmentId: string;
  uploadUrl: string;
  downloadUrl: string;
  expiresAt: string;
  maxBytes: number;
  contentClass: ContentClass;
  retentionMode: RetentionMode;
  protectionProfile: ProtectionProfile;
  previewBlurHash?: string;
}

export interface ReportDisclosure {
  targetConversationId?: ConversationId;
  targetAccountId?: AccountId;
  targetAttachmentId?: string;
  reason: ReportReason;
  evidenceMessageIds?: string[];
  disclosedPayload: Record<string, unknown>;
}

export interface BlockRule {
  accountId: AccountId;
  blockedAccountId: AccountId;
  createdAt: string;
}

export interface ConversationDescriptor {
  id: ConversationId;
  kind: "direct_message" | "group";
  title?: string;
  epoch: GroupEpoch;
  memberAccountIds: AccountId[];
  memberCap?: number;
  sensitiveMediaDefault?: boolean;
  joinRuleText?: string | null;
  allowMemberInvites?: boolean;
  createdAt: string;
}

export interface SafetyEvent {
  accountId: AccountId;
  eventType: "key_reset" | "device_revoked";
  createdAt: string;
}

export interface GroupInviteDescriptor {
  id: string;
  conversationId: ConversationId;
  inviteToken: string;
  inviteUrl: string;
  createdAt: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  note?: string | null;
  inviterDisplayName: string;
  status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
}

export interface GroupInviteRecord {
  id: string;
  conversationId: ConversationId;
  createdAt: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  note?: string | null;
  inviterDisplayName: string;
  status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
  createdByCurrentAccount: boolean;
}

export interface GroupInvitePreview {
  invite: {
    id: string;
    status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
    expiresAt?: string | null;
    maxUses?: number | null;
    useCount: number;
    note?: string | null;
    inviterDisplayName: string;
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

export interface GroupInviteAcceptance {
  conversationId: ConversationId;
  title: string;
  epoch: GroupEpoch;
}

export interface GroupMembershipSummary {
  id: ConversationId;
  title: string;
  epoch: GroupEpoch;
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
  senderAccountId: AccountId;
  senderDisplayName: string;
  kind: "text" | "media" | "system_notice";
  text?: string | null;
  attachment?: {
    id: string;
    downloadUrl: string;
    fileName: string;
    mimeType: string;
    byteLength: number;
    contentClass: ContentClass;
    retentionMode: RetentionMode;
    protectionProfile: ProtectionProfile;
    previewBlurHash?: string | null;
  } | null;
  createdAt: string;
}

export interface MeProfile {
  id: AccountId;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
}

export interface PrivacySettings {
  notificationPreviewMode: NotificationPreviewMode;
  autoDownloadSensitiveMedia: boolean;
  allowSensitiveExport: boolean;
  secureAppSwitcher: boolean;
}

export interface SessionDescriptor {
  id: SessionId;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
}
