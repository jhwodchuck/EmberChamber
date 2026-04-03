import type {
  AttachmentTicket,
  AttachmentEncryptionMode,
  AuthStartRequest,
  AuthSession,
  CipherEnvelope,
  ConversationDetail,
  ConversationDescriptor,
  ConversationInviteAcceptance,
  ConversationInviteDescriptor,
  ConversationInvitePreview,
  ConversationSearchResult,
  ConversationSummary,
  DeviceKeyBundle,
  MailboxAck,
  PrekeyBundle,
  GroupInviteAcceptance,
  GroupInviteDescriptor,
  GroupInvitePreview,
  GroupMembershipSummary,
  GroupThreadMessage,
  MagicLinkChallenge,
  MeProfile,
  PrivacySettings,
  SessionDescriptor,
} from "@emberchamber/protocol";

const relayUrl =
  process.env.NEXT_PUBLIC_RELAY_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8787";

export function getRelayWebsocketUrl() {
  const url = new URL(relayUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.origin;
}

const RELAY_SESSION_STORAGE_KEY = "emberchamber.relay.session.v1";

type RelayErrorBody = {
  error?: string;
  code?: string;
};

export type RelayStoredSession = AuthSession;

export class RelayRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "RelayRequestError";
    this.status = status;
    this.code = code;
  }
}

function parseRelayError(status: number, body: RelayErrorBody) {
  return new RelayRequestError(body.error ?? "Relay request failed", status, body.code);
}

export function readRelaySession(): RelayStoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(RELAY_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RelayStoredSession;
  } catch {
    window.localStorage.removeItem(RELAY_SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeRelaySession(session: RelayStoredSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RELAY_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearRelaySession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(RELAY_SESSION_STORAGE_KEY);
}

export function hasRelaySession() {
  return !!readRelaySession();
}

function decodeTokenPayload(token: string): { exp?: number } | null {
  const [encoded] = token.split(".");
  if (!encoded) {
    return null;
  }

  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function isAccessTokenNearExpiry(token: string, thresholdSeconds = 60) {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) {
    return true;
  }

  return payload.exp <= Math.floor(Date.now() / 1000) + thresholdSeconds;
}

async function refreshRelaySession(): Promise<RelayStoredSession | null> {
  const current = readRelaySession();
  if (!current?.refreshToken) {
    clearRelaySession();
    return null;
  }

  const response = await fetch(`${relayUrl}/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });

  const body = ((await response.json().catch(() => ({}))) ?? {}) as
    | { accessToken: string; sessionId: string; deviceId: string }
    | RelayErrorBody;
  if (!response.ok || !("accessToken" in body)) {
    clearRelaySession();
    return null;
  }

  const nextSession: RelayStoredSession = {
    ...current,
    accessToken: body.accessToken,
    sessionId: body.sessionId,
    deviceId: body.deviceId,
  };
  storeRelaySession(nextSession);
  return nextSession;
}

export async function ensureRelayAccessToken(minTtlSeconds = 60): Promise<RelayStoredSession | null> {
  const current = readRelaySession();
  if (!current) {
    return null;
  }

  if (!current.accessToken || isAccessTokenNearExpiry(current.accessToken, minTtlSeconds)) {
    return refreshRelaySession();
  }

  return current;
}

async function relayFetch<T>(
  path: string,
  options: RequestInit = {},
  config: { auth?: boolean; retryAfterRefresh?: boolean } = {},
): Promise<T> {
  const { auth = true, retryAfterRefresh = true } = config;
  const session = auth ? readRelaySession() : null;
  const headers: HeadersInit = {
    "content-type": "application/json",
    ...(auth && session?.accessToken ? { authorization: `Bearer ${session.accessToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${relayUrl}${path}`, {
    ...options,
    headers,
  });

  const body = ((await response.json().catch(() => ({}))) ?? {}) as T & RelayErrorBody;
  if (response.ok) {
    return body as T;
  }

  if (auth && response.status === 401 && retryAfterRefresh) {
    const refreshed = await refreshRelaySession();
    if (refreshed) {
      return relayFetch<T>(path, options, { auth, retryAfterRefresh: false });
    }
  }

  throw parseRelayError(response.status, body);
}

export async function startMagicLink(input: AuthStartRequest): Promise<MagicLinkChallenge> {
  return relayFetch<MagicLinkChallenge>(
    "/v1/auth/start",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { auth: false },
  );
}

export async function completeMagicLink(input: {
  completionToken: string;
  deviceLabel?: string;
}): Promise<AuthSession> {
  return relayFetch<AuthSession>(
    "/v1/auth/complete",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    { auth: false },
  );
}

export const relayAccountApi = {
  me: () => relayFetch<MeProfile>("/v1/me"),
  updateProfile: (data: { displayName?: string; bio?: string }) =>
    relayFetch<{ updated: boolean; displayName: string; bio: string | null }>(
      "/v1/me",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),
  getPrivacy: () => relayFetch<PrivacySettings>("/v1/me/privacy"),
  updatePrivacy: (data: PrivacySettings) =>
    relayFetch<PrivacySettings>("/v1/me/privacy", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  listSessions: () => relayFetch<SessionDescriptor[]>("/v1/sessions"),
  revokeSession: (sessionId: string) =>
    relayFetch<{ revoked: boolean; sessionId: string }>(`/v1/sessions/${sessionId}`, {
      method: "DELETE",
    }),
};

export const relayGroupApi = {
  listGroups: () => relayFetch<GroupMembershipSummary[]>("/v1/groups"),
  createGroup: (data: {
    title: string;
    memberAccountIds?: string[];
    memberCap?: number;
    sensitiveMediaDefault?: boolean;
    joinRuleText?: string;
  }) =>
    relayFetch<ConversationDescriptor>("/v1/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createInvite: (
    groupId: string,
    data: { maxUses?: number; expiresInHours?: number; note?: string } = {},
  ) =>
    relayFetch<GroupInviteDescriptor>(`/v1/groups/${groupId}/invites`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  previewInvite: (groupId: string, inviteToken: string) =>
    relayFetch<GroupInvitePreview>(
      `/v1/groups/${groupId}/invites/${encodeURIComponent(inviteToken)}/preview`,
      undefined,
      { auth: false },
    ),
  acceptInvite: (groupId: string, inviteToken: string) =>
    relayFetch<GroupInviteAcceptance>(
      `/v1/groups/${groupId}/invites/${encodeURIComponent(inviteToken)}/accept`,
      { method: "POST" },
    ),
  revokeInvite: (groupId: string, inviteId: string) =>
    relayFetch<{ revoked: boolean; inviteId: string }>(`/v1/groups/${groupId}/invites/${inviteId}`, {
      method: "DELETE",
    }),
  listMessages: (groupId: string, limit = 50) =>
    relayFetch<GroupThreadMessage[]>(`/v1/groups/${groupId}/messages?limit=${encodeURIComponent(String(limit))}`),
  sendMessage: (
    groupId: string,
    data: { text?: string; attachmentId?: string; clientMessageId?: string },
  ) =>
    relayFetch<GroupThreadMessage>(`/v1/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeMember: (groupId: string, accountId: string) =>
    relayFetch<{ removed: boolean; conversationId: string; targetAccountId: string; epoch: number }>(
      `/v1/groups/${groupId}/members/${accountId}/remove`,
      { method: "POST" },
    ),
};

export const relayConversationApi = {
  list: () => relayFetch<ConversationSummary[]>("/v1/conversations"),
  get: (conversationId: string) => relayFetch<ConversationDetail>(`/v1/conversations/${conversationId}`),
  search: (query: string, communityId?: string) =>
    relayFetch<ConversationSearchResult>(
      `/v1/search?q=${encodeURIComponent(query)}${
        communityId ? `&communityId=${encodeURIComponent(communityId)}` : ""
      }`,
    ),
  openDm: (peerAccountId: string) =>
    relayFetch<ConversationDescriptor>("/v1/dm/open", {
      method: "POST",
      body: JSON.stringify({ peerAccountId }),
    }),
  createCommunity: (data: {
    title: string;
    memberAccountIds?: string[];
    memberCap?: number;
    sensitiveMediaDefault?: boolean;
    joinRuleText?: string;
    allowMemberInvites?: boolean;
    defaultRoomTitle?: string;
  }) =>
    relayFetch<ConversationDescriptor>("/v1/communities", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCommunityPolicies: (
    communityId: string,
    data: { allowMemberInvites?: boolean; inviteFreezeEnabled?: boolean },
  ) =>
    relayFetch<ConversationDetail>(`/v1/communities/${communityId}/policies`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  createRoom: (
    communityId: string,
    data: {
      title: string;
      joinRuleText?: string;
      sensitiveMediaDefault?: boolean;
      roomAccessPolicy?: "all_members" | "restricted";
      memberAccountIds?: string[];
    },
  ) =>
    relayFetch<ConversationSummary>(`/v1/communities/${communityId}/rooms`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addRoomMember: (communityId: string, roomId: string, accountId: string) =>
    relayFetch<{ added: boolean; communityId: string; roomId: string; targetAccountId: string }>(
      `/v1/communities/${communityId}/rooms/${roomId}/members/${accountId}/add`,
      { method: "POST" },
    ),
  removeRoomMember: (communityId: string, roomId: string, accountId: string) =>
    relayFetch<{ removed: boolean; communityId: string; roomId: string; targetAccountId: string }>(
      `/v1/communities/${communityId}/rooms/${roomId}/members/${accountId}/remove`,
      { method: "POST" },
    ),
  removeCommunityMember: (communityId: string, accountId: string) =>
    relayFetch<{ removed: boolean; communityId: string; targetAccountId: string }>(
      `/v1/communities/${communityId}/members/${accountId}/remove`,
      { method: "POST" },
    ),
  listMessages: (conversationId: string, limit = 50) =>
    relayFetch<GroupThreadMessage[]>(
      `/v1/conversations/${conversationId}/messages?limit=${encodeURIComponent(String(limit))}`,
    ),
  sendMessage: (
    conversationId: string,
    data: { text?: string; attachmentId?: string; clientMessageId?: string },
  ) =>
    relayFetch<GroupThreadMessage>(`/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createInvite: (
    conversationId: string,
    data: {
      maxUses?: number;
      expiresInHours?: number;
      note?: string;
      scope?: "conversation" | "room";
      roomId?: string;
    } = {},
  ) =>
    relayFetch<ConversationInviteDescriptor>(`/v1/conversations/${conversationId}/invites`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  previewInvite: (conversationId: string, inviteToken: string) =>
    relayFetch<ConversationInvitePreview>(
      `/v1/conversations/${conversationId}/invites/${encodeURIComponent(inviteToken)}/preview`,
      undefined,
      { auth: false },
    ),
  acceptInvite: (conversationId: string, inviteToken: string) =>
    relayFetch<ConversationInviteAcceptance>(
      `/v1/conversations/${conversationId}/invites/${encodeURIComponent(inviteToken)}/accept`,
      { method: "POST" },
    ),
  revokeInvite: (conversationId: string, inviteId: string) =>
    relayFetch<{ revoked: boolean; inviteId: string }>(`/v1/conversations/${conversationId}/invites/${inviteId}`, {
      method: "DELETE",
    }),
};

export const relayDeviceApi = {
  registerBundle: (bundle: PrekeyBundle) =>
    relayFetch<{ registered: boolean; deviceId: string }>("/v1/devices/register", {
      method: "POST",
      body: JSON.stringify(bundle),
    }),
  listBundles: (accountId: string) =>
    relayFetch<DeviceKeyBundle[]>(`/v1/accounts/${accountId}/device-bundles`),
};

export const relayMailboxApi = {
  sendBatch: (data: {
    conversationId: string;
    epoch: number;
    envelopes: Array<{
      recipientDeviceId: string;
      ciphertext: string;
      clientMessageId: string;
      attachmentIds?: string[];
    }>;
  }) =>
    relayFetch<{
      acceptedEnvelopeIds: string[];
      duplicateEnvelopeIds?: string[];
      blockedRecipients?: string[];
      rejectedRecipients?: string[];
    }>("/v1/messages/batch", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  sync: (cursor?: string, limit = 50) =>
    relayFetch<{
      cursor: { lastSeenEnvelopeId?: string };
      envelopes: CipherEnvelope[];
      stats?: {
        enqueued: number;
        acknowledged: number;
        expired: number;
        rejected: number;
        queued: number;
      };
    }>(`/v1/mailbox/sync?after=${encodeURIComponent(cursor ?? "")}&limit=${encodeURIComponent(String(limit))}`),
  ack: (data: MailboxAck) =>
    relayFetch<{ acknowledged: number }>("/v1/mailbox/ack", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export function createRelayMailboxWebSocket(accessToken: string) {
  return new WebSocket(
    `${getRelayWebsocketUrl()}/v1/mailbox/ws?token=${encodeURIComponent(accessToken)}`,
  );
}

export const relayAttachmentApi = {
  createTicket: (data: {
    fileName: string;
    mimeType: string;
    byteLength?: number;
    sha256B64?: string;
    encryptionMode?: AttachmentEncryptionMode;
    ciphertextByteLength?: number;
    ciphertextSha256B64?: string;
    plaintextByteLength?: number;
    plaintextSha256B64?: string;
    conversationId?: string;
    conversationEpoch?: number;
    contentClass?: "image" | "video" | "audio" | "file";
    retentionMode?: "private_vault" | "ephemeral";
    protectionProfile?: "sensitive_media" | "standard";
    previewBlurHash?: string;
  }) =>
    relayFetch<AttachmentTicket>("/v1/attachments/ticket", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  refreshDownloadUrl: (attachmentId: string) =>
    relayFetch<{ attachmentId: string; downloadUrl: string; expiresAt: string }>(
      `/v1/attachments/${attachmentId}/access`,
    ),
};

export async function uploadAttachment(uploadUrl: string, body: ArrayBuffer, contentType: string) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": contentType,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = ((await response.json().catch(() => ({}))) ?? {}) as RelayErrorBody;
    throw parseRelayError(response.status, errorBody);
  }

  return (await response.json().catch(() => ({}))) as { uploaded: boolean };
}
