import type {
  AuthSession,
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

export async function startMagicLink(input: {
  email: string;
  inviteToken?: string;
  groupId?: string;
  groupInviteToken?: string;
  deviceLabel: string;
}): Promise<MagicLinkChallenge> {
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
    allowMemberInvites?: boolean;
  }) =>
    relayFetch<{
      id: string;
      kind: "group";
      title: string;
      epoch: number;
      memberAccountIds: string[];
      memberCap?: number;
      sensitiveMediaDefault?: boolean;
      joinRuleText?: string | null;
      allowMemberInvites?: boolean;
      createdAt: string;
    }>("/v1/groups", {
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
