export type MagicLinkResponse = {
  id: string;
  expiresAt: string;
  inviteRequired: boolean;
  debugCompletionToken?: string;
};

export type RelayErrorResponse = {
  error?: string;
  code?: string;
};

export type AuthSession = {
  accountId: string;
  deviceId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  passkeyEnrollmentSuggested: boolean;
  bootstrapConversationId?: string;
  bootstrapConversationTitle?: string;
};

export type MeProfile = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
};

export type ContactCard = {
  accountId: string;
  label: string;
  cardToken: string;
  conversationHint?: string;
};

export type GroupMembershipSummary = {
  id: string;
  title: string;
  epoch: number;
  historyMode: "relay_hosted" | "device_encrypted";
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
};

export type GroupThreadMessage = {
  id: string;
  conversationId: string;
  historyMode: "relay_hosted" | "device_encrypted";
  senderAccountId: string;
  senderDisplayName: string;
  kind: "text" | "media" | "system_notice";
  text?: string | null;
  attachment?: {
    id: string;
    downloadUrl?: string;
    fileName: string;
    mimeType: string;
    byteLength: number;
    contentClass: "image" | "video" | "audio" | "file";
    retentionMode: "private_vault" | "ephemeral";
    protectionProfile: "sensitive_media" | "standard";
    previewBlurHash?: string | null;
    encryptionMode?: "none" | "device_encrypted";
    fileKeyB64?: string | null;
    fileIvB64?: string | null;
  } | null;
  createdAt: string;
  editedAt?: string | null;
  readByCount?: number;
};

export type GroupInviteRecord = {
  id: string;
  conversationId: string;
  createdAt: string;
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount: number;
  note?: string | null;
  inviterDisplayName: string;
  status: "active" | "revoked" | "expired" | "exhausted" | "frozen";
  createdByCurrentAccount: boolean;
};

export type GroupInvitePreview = {
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
    id: string;
    title: string;
    memberCount: number;
    memberCap: number;
    joinRuleText?: string | null;
    sensitiveMediaDefault: boolean;
  };
};

export type GroupInviteAcceptance = {
  conversationId: string;
  title: string;
  epoch: number;
};

export type AttachmentTicket = {
  attachmentId: string;
  uploadUrl: string;
  downloadUrl: string;
  expiresAt: string;
  maxBytes: number;
  encryptionMode: "none" | "device_encrypted";
  contentClass: "image" | "video" | "audio" | "file";
  retentionMode: "private_vault" | "ephemeral";
  protectionProfile: "sensitive_media" | "standard";
  previewBlurHash?: string;
};

export type DeviceKeyBundle = {
  accountId: string;
  deviceId: string;
  deviceLabel: string;
  uploadedAt: string;
  bundle: {
    identityKeyB64: string;
    signedPrekeyB64: string;
    signedPrekeySignatureB64: string;
    oneTimePrekeysB64: string[];
    privateKeyB64?: string;
  };
};

export type PendingAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  byteLength: number;
  width?: number;
  height?: number;
};

export type FormMessage = {
  tone: "error" | "success" | "warning" | "info";
  title: string;
  body: string;
};

export type Field = "email" | "inviteToken" | "deviceLabel" | "groupInvite" | "ageConfirmed18";
export type NotificationPreviewMode = "discreet" | "expanded" | "none";

export type PrivacyDefaults = {
  notificationPreviewMode: NotificationPreviewMode;
  autoDownloadSensitiveMedia: boolean;
  allowSensitiveExport: boolean;
  secureAppSwitcher: boolean;
};

export type ConversationPreference = {
  conversationId: string;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  lastReadAt: string | null;
};

export type InviteReference = {
  groupId: string;
  inviteToken: string;
};
