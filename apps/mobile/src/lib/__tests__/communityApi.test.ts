import type { AuthSession } from "../../types";
import {
  createCommunityInvite,
  createRoomInvite,
  fetchCommunityDetail,
  removeCommunityMember,
  searchCommunityConversations,
  updateCommunityPolicies,
} from "../communityApi";

const session = { accountId: "acc-1" } as AuthSession;

function mockRelayFetch() {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const relayFetch = (async <T>(
    _session: AuthSession,
    path: string,
    init?: RequestInit,
  ): Promise<T> => {
    calls.push({ path, init });
    return {} as T;
  }) as <T>(s: AuthSession, p: string, i?: RequestInit) => Promise<T>;
  return { relayFetch, calls };
}

function body(init?: RequestInit): Record<string, unknown> {
  return init?.body ? JSON.parse(init.body as string) : {};
}

describe("communityApi request shaping", () => {
  it("fetches community detail from the conversation detail endpoint", async () => {
    const { relayFetch, calls } = mockRelayFetch();
    await fetchCommunityDetail(relayFetch, session, "comm-1");
    expect(calls[0].path).toBe("/v1/conversations/comm-1");
  });

  it("PATCHes community policies", async () => {
    const { relayFetch, calls } = mockRelayFetch();
    await updateCommunityPolicies(relayFetch, session, "comm-1", {
      inviteFreezeEnabled: true,
    });
    expect(calls[0].path).toBe("/v1/communities/comm-1/policies");
    expect(calls[0].init?.method).toBe("PATCH");
    expect(body(calls[0].init)).toEqual({ inviteFreezeEnabled: true });
  });

  it("removes a community member via POST .../remove (matches relay contract)", async () => {
    const { relayFetch, calls } = mockRelayFetch();
    await removeCommunityMember(relayFetch, session, "comm-1", "acc-9");
    expect(calls[0].path).toBe("/v1/communities/comm-1/members/acc-9/remove");
    expect(calls[0].init?.method).toBe("POST");
  });

  it("creates a conversation-scoped invite", async () => {
    const { relayFetch, calls } = mockRelayFetch();
    await createCommunityInvite(relayFetch, session, "comm-1", {
      maxUses: 5,
      expiresInHours: 72,
    });
    expect(calls[0].path).toBe("/v1/conversations/comm-1/invites");
    expect(body(calls[0].init)).toEqual({
      scope: "conversation",
      maxUses: 5,
      expiresInHours: 72,
    });
  });

  it("creates a room-scoped invite with the target room id", async () => {
    const { relayFetch, calls } = mockRelayFetch();
    await createRoomInvite(relayFetch, session, "comm-1", "room-7");
    expect(body(calls[0].init)).toEqual({
      scope: "room",
      targetRoomConversationId: "room-7",
    });
  });

  it("scopes search to the shared /v1/search endpoint", async () => {
    const { relayFetch, calls } = mockRelayFetch();
    await searchCommunityConversations(relayFetch, session, "comm-1", "alpha");
    expect(calls[0].path).toBe("/v1/search?q=alpha&communityId=comm-1");
  });
});
