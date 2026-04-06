export type AccountId = string;
export type DeviceId = string;
export type ConversationId = string;
export type SessionId = string;
export type GroupEpoch = number;
export type ConversationKind = "direct_message" | "group" | "community" | "room";
export type ContentClass = "image" | "video" | "audio" | "file";
export type RetentionMode = "private_vault" | "ephemeral";
export type ProtectionProfile = "sensitive_media" | "standard";
export type ConversationHistoryMode = "relay_hosted" | "device_encrypted";
export type AttachmentEncryptionMode = "none" | "device_encrypted";
export type RoomAccessPolicy = "all_members" | "restricted";
export type ConversationInviteScope = "conversation" | "room";
export type NotificationPreviewMode = "discreet" | "expanded" | "none";
export type PushProvider = "fcm" | "apns";
export type PushPlatform = "android" | "ios";
export type PushEnvironment = "production" | "sandbox";
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

export interface AuthStartRequest {
  email: string;
  inviteToken?: string;
  groupId?: string;
  groupInviteToken?: string;
  deviceLabel: string;
  ageConfirmed18: true;
}

export interface AuthCompleteRequest {
  completionToken: string;
  deviceLabel?: string;
}

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

export interface DevicePushTokenRegistration {
  provider: PushProvider;
  platform: PushPlatform;
  token: string;
  appId?: string;
  pushEnvironment?: PushEnvironment;
}

export interface DevicePushTokenStatus {
  registered: boolean;
  deviceId: DeviceId;
  provider: PushProvider;
  platform: PushPlatform;
}

export interface DevicePushTokenClearResult {
  cleared: boolean;
  deviceId: DeviceId;
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
  cursor: MailboxCursor;
  envelopes: CipherEnvelope[];
  stats?: {
    enqueued: number;
    acknowledged: number;
    expired: number;
    rejected: number;
    queued: number;
  };
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
  encryptionMode: AttachmentEncryptionMode;
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
  kind: ConversationKind;
  title?: string;
  epoch: GroupEpoch;
  historyMode: ConversationHistoryMode;
  parentConversationId?: ConversationId | null;
  memberAccountIds: AccountId[];
  memberCount?: number;
  roomCount?: number;
  memberCap?: number;
  sensitiveMediaDefault?: boolean;
  joinRuleText?: string | null;
  allowMemberInvites?: boolean;
  inviteFreezeEnabled?: boolean;
  roomAccessPolicy?: RoomAccessPolicy | null;
  createdAt: string;
}

export interface ConversationCapabilities {
  relayHostedMessages: boolean;
  mailboxTransport: boolean;
  encryptedAttachments: boolean;
  canCreateInvites: boolean;
  canManageMembers: boolean;
  canManagePolicies: boolean;
  canManageRooms: boolean;
  canGrantRoomAccess: boolean;
}

export interface ConversationMemberSummary {
  accountId: AccountId;
  username: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  removedAt?: string | null;
}

export interface ConversationSummary {
  id: ConversationId;
  kind: ConversationKind;
  title?: string;
  epoch: GroupEpoch;
  historyMode: ConversationHistoryMode;
  parentConversationId?: ConversationId | null;
  memberAccountIds: AccountId[];
  memberCount: number;
  roomCount?: number;
  memberCap?: number;
  sensitiveMediaDefault?: boolean;
  joinRuleText?: string | null;
  allowMemberInvites?: boolean;
  inviteFreezeEnabled?: boolean;
  roomAccessPolicy?: RoomAccessPolicy | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  lastMessageKind?: string | null;
  capabilities: ConversationCapabilities;
}

export interface ConversationDetail extends ConversationSummary {
  members: ConversationMemberSummary[];
  rooms?: ConversationSummary[];
}

export interface SearchAccountResult {
  accountId: AccountId;
  username: string;
  displayName: string;
  sharedConversationId?: ConversationId;
}

export interface ConversationSearchResult {
  query: string;
  scopedCommunityId?: ConversationId;
  conversations: ConversationSummary[];
  accounts: SearchAccountResult[];
}

export interface ConversationInviteDescriptor {
  id: string;
  conversationId: ConversationId;
  conversationKind: "group" | "community";
  scope: ConversationInviteScope;
  targetRoomConversationId?: ConversationId | null;
  targetRoomTitle?: string | null;
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

export interface ConversationInvitePreview {
  invite: {
    id: string;
    status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
    scope: ConversationInviteScope;
    inviterDisplayName: string;
    expiresAt?: string | null;
    maxUses?: number | null;
    useCount: number;
    note?: string | null;
    targetRoomConversationId?: ConversationId | null;
    targetRoomTitle?: string | null;
  };
  conversation: {
    id: ConversationId;
    kind: "group" | "community";
    title: string;
    memberCount: number;
    memberCap: number;
    joinRuleText?: string | null;
    sensitiveMediaDefault?: boolean;
    allowMemberInvites?: boolean;
    inviteFreezeEnabled?: boolean;
  };
  room?: {
    id: ConversationId;
    title: string;
    memberCount: number;
    roomAccessPolicy: RoomAccessPolicy;
  } | null;
}

export interface ConversationInviteAcceptance {
  conversationId: ConversationId;
  rootConversationId: ConversationId;
  rootConversationKind: "group" | "community";
  title: string;
  epoch: GroupEpoch;
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
  historyMode: ConversationHistoryMode;
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

export interface GroupMember {
  accountId: AccountId;
  displayName: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  messageCount: number;
}

export interface GroupThreadMessage {
  id: string;
  conversationId: ConversationId;
  historyMode: ConversationHistoryMode;
  senderAccountId: AccountId;
  senderDisplayName: string;
  kind: "text" | "media" | "system_notice";
  text?: string | null;
  attachment?: {
    id: string;
    downloadUrl?: string;
    fileName: string;
    mimeType: string;
    byteLength: number;
    contentClass: ContentClass;
    retentionMode: RetentionMode;
    protectionProfile: ProtectionProfile;
    previewBlurHash?: string | null;
    encryptionMode?: AttachmentEncryptionMode;
    fileKeyB64?: string | null;
    fileIvB64?: string | null;
  } | null;
  createdAt: string;
  editedAt?: string | null;
  readByCount?: number;
}

export interface MeProfile {
  id: AccountId;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
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
  clientPlatform?: string | null;
  clientVersion?: string | null;
  clientBuild?: string | null;
  deviceModel?: string | null;
}

export * from "./e2ee";
export * from "./device-link";
