export type AccountId = string;
export type DeviceId = string;
export type ConversationId = string;
export type SessionId = string;
export type GroupEpoch = number;

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
}

export interface ReportDisclosure {
  targetConversationId?: ConversationId;
  targetAccountId?: AccountId;
  reason: string;
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
  createdAt: string;
}

export interface SafetyEvent {
  accountId: AccountId;
  eventType: "key_reset" | "device_revoked";
  createdAt: string;
}
