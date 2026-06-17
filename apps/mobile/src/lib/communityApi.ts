import type { AuthSession } from "../types";
import type {
  CommunityDetail,
  CommunityRoom,
  ConversationInviteDescriptor,
} from "../types";

type RelayFetch = <T>(
  session: AuthSession,
  path: string,
  init?: RequestInit,
  allowRefresh?: boolean,
) => Promise<T>;

export async function fetchCommunityDetail(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
): Promise<CommunityDetail> {
  return relayFetch<CommunityDetail>(
    session,
    `/v1/conversations/${communityId}`,
  );
}

export async function updateCommunityPolicies(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
  policies: {
    allowMemberInvites?: boolean;
    inviteFreezeEnabled?: boolean;
    sensitiveMediaDefault?: boolean;
  },
): Promise<void> {
  await relayFetch<unknown>(session, `/v1/communities/${communityId}/policies`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(policies),
  });
}

export async function createCommunityRoom(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
  title: string,
  roomAccessPolicy: CommunityRoom["roomAccessPolicy"],
): Promise<{ id: string }> {
  return relayFetch<{ id: string }>(
    session,
    `/v1/communities/${communityId}/rooms`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, roomAccessPolicy }),
    },
  );
}

export async function removeCommunityMember(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
  accountId: string,
): Promise<void> {
  await relayFetch<unknown>(
    session,
    `/v1/communities/${communityId}/members/${accountId}/remove`,
    { method: "POST" },
  );
}

export async function createCommunityInvite(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
  opts?: { maxUses?: number; expiresInHours?: number; note?: string },
): Promise<ConversationInviteDescriptor> {
  return relayFetch<ConversationInviteDescriptor>(
    session,
    `/v1/conversations/${communityId}/invites`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "conversation", ...opts }),
    },
  );
}

export async function createRoomInvite(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
  roomId: string,
  opts?: { maxUses?: number; expiresInHours?: number; note?: string },
): Promise<ConversationInviteDescriptor> {
  return relayFetch<ConversationInviteDescriptor>(
    session,
    `/v1/conversations/${communityId}/invites`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: "room",
        targetRoomConversationId: roomId,
        ...opts,
      }),
    },
  );
}

export async function listCommunityInvites(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
): Promise<ConversationInviteDescriptor[]> {
  return relayFetch<ConversationInviteDescriptor[]>(
    session,
    `/v1/conversations/${communityId}/invites`,
  );
}

export type CommunitySearchResult = {
  query: string;
  scopedCommunityId: string | null;
  conversations: Array<{
    id: string;
    kind: string;
    title?: string;
    memberCount: number;
    parentConversationId?: string | null;
  }>;
  accounts: Array<{
    accountId: string;
    username: string;
    displayName: string;
    sharedConversationId: string;
  }>;
};

export async function searchCommunityConversations(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
  query: string,
): Promise<CommunitySearchResult> {
  return relayFetch<CommunitySearchResult>(
    session,
    `/v1/search?q=${encodeURIComponent(query)}&communityId=${encodeURIComponent(communityId)}`,
  );
}

export async function revokeCommunityInvite(
  relayFetch: RelayFetch,
  session: AuthSession,
  communityId: string,
  inviteId: string,
): Promise<void> {
  await relayFetch<unknown>(
    session,
    `/v1/conversations/${communityId}/invites/${inviteId}`,
    { method: "DELETE" },
  );
}
