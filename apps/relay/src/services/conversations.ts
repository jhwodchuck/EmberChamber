import type {
  ConversationDetail,
  ConversationSummary,
  RoomAccessPolicy,
  CipherEnvelope,
} from "@emberchamber/protocol";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError } from "../lib/http";
import type { Env, LoadedConversation, RelayConversationKind } from "../types";
import { accountUsername } from "./utils";
import { appendConversationMessage } from "./messages";

export function normalizeConversationRole(
  role: string | null | undefined,
): "owner" | "admin" | "member" {
  return role === "owner" || role === "admin" ? role : "member";
}

export function isOrganizerRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function defaultConversationTitle(kind: RelayConversationKind): string {
  switch (kind) {
    case "community":
      return "Untitled community";
    case "room":
      return "Untitled room";
    case "direct_message":
      return "Direct message";
    default:
      return "Untitled group";
  }
}

export function conversationHistoryModeForKind(
  kind: RelayConversationKind,
): "device_encrypted" | "relay_hosted" {
  return kind === "direct_message" || kind === "group"
    ? "device_encrypted"
    : "relay_hosted";
}

export function coerceConversationHistoryMode(
  mode: string | null | undefined,
  kind: RelayConversationKind,
): "device_encrypted" | "relay_hosted" {
  if (mode === "device_encrypted" || mode === "relay_hosted") {
    return mode;
  }

  return conversationHistoryModeForKind(kind);
}

export function coerceRoomAccessPolicy(
  policy: string | null | undefined,
): RoomAccessPolicy {
  return policy === "restricted" ? "restricted" : "all_members";
}

export function sqlPlaceholders(start: number, count: number): string {
  return Array.from({ length: count }, (_, index) => `?${start + index}`).join(
    ", ",
  );
}

export function conversationCapabilities(input: {
  kind: RelayConversationKind;
  historyMode: string | null;
  myRole: string;
  allowMemberInvites?: boolean;
}) {
  const historyMode =
    input.historyMode ?? conversationHistoryModeForKind(input.kind);
  const organizer = isOrganizerRole(input.myRole);
  const canManageMembers =
    ["group", "community"].includes(input.kind) && organizer;
  const canManagePolicies =
    ["group", "community"].includes(input.kind) && organizer;
  const canManageRooms = input.kind === "community" && organizer;
  const canGrantRoomAccess = input.kind === "community" && organizer;
  const canCreateInvites =
    (input.kind === "group" && organizer) ||
    (input.kind === "community" &&
      (organizer || Boolean(input.allowMemberInvites)));

  return {
    relayHostedMessages: historyMode === "relay_hosted",
    mailboxTransport: true,
    encryptedAttachments: true,
    canCreateInvites,
    canManageMembers,
    canManagePolicies,
    canManageRooms,
    canGrantRoomAccess,
  };
}

export async function updateConversationActivity(
  env: Env,
  conversationId: string,
  input: { at: string; kind: string },
) {
  await dbRun(
    env.DB,
    `UPDATE conversations
        SET updated_at = ?1,
            last_message_at = ?1,
            last_message_kind = ?2
      WHERE id = ?3`,
    input.at,
    input.kind,
    conversationId,
  );
}

export async function upsertConversationMember(
  env: Env,
  conversationId: string,
  accountId: string,
  role: "owner" | "admin" | "member",
  joinedAt: string,
) {
  await dbRun(
    env.DB,
    `INSERT INTO conversation_members (conversation_id, account_id, role, joined_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(conversation_id, account_id) DO UPDATE
       SET removed_at = NULL,
           joined_at = excluded.joined_at,
           role = excluded.role`,
    conversationId,
    accountId,
    role,
    joinedAt,
  );
}

export async function listActiveConversationMembers(
  env: Env,
  conversationId: string,
): Promise<Array<{ accountId: string; role: "owner" | "admin" | "member" }>> {
  const rows = await dbAll<{ account_id: string; role: string }>(
    env.DB,
    `SELECT account_id, role
       FROM conversation_members
      WHERE conversation_id = ?1
        AND removed_at IS NULL`,
    conversationId,
  );

  return rows.map((row) => ({
    accountId: row.account_id,
    role: normalizeConversationRole(row.role),
  }));
}

export async function syncRelayHostedConversationSockets(
  env: Env,
  conversationId: string,
): Promise<void> {
  const conversation = await dbFirst<{
    id: string;
    kind: RelayConversationKind;
    epoch: number;
    history_mode: string | null;
  }>(
    env.DB,
    "SELECT id, kind, epoch, history_mode FROM conversations WHERE id = ?1",
    conversationId,
  );

  if (!conversation) {
    return;
  }

  const historyMode = coerceConversationHistoryMode(
    conversation.history_mode,
    conversation.kind,
  );
  if (historyMode !== "relay_hosted") {
    return;
  }

  const memberRows = await dbAll<{ account_id: string }>(
    env.DB,
    "SELECT account_id FROM conversation_members WHERE conversation_id = ?1 AND removed_at IS NULL",
    conversationId,
  );

  const id = env.GROUP_COORDINATOR.idFromName(conversationId);
  const stub = env.GROUP_COORDINATOR.get(id);
  await stub.fetch("https://do/rotate", {
    method: "POST",
    body: JSON.stringify({
      conversationId,
      epoch: conversation.epoch,
      memberAccountIds: memberRows.map((row) => row.account_id),
    }),
  });
}

export async function syncCommunityMemberIntoAllMemberRooms(
  env: Env,
  communityId: string,
  accountId: string,
  joinedAt: string,
) {
  const communityMembership = await dbFirst<{ role: string }>(
    env.DB,
    `SELECT role
       FROM conversation_members
      WHERE conversation_id = ?1
        AND account_id = ?2
        AND removed_at IS NULL`,
    communityId,
    accountId,
  );

  if (!communityMembership) {
    throw new HttpError(
      404,
      "Community membership not found",
      "COMMUNITY_MEMBER_NOT_FOUND",
    );
  }

  const inheritedRole = normalizeConversationRole(communityMembership.role);
  const roomRows = await dbAll<{ id: string }>(
    env.DB,
    `SELECT id
       FROM conversations
      WHERE parent_conversation_id = ?1
        AND kind = 'room'
        AND room_access_policy = 'all_members'`,
    communityId,
  );

  for (const room of roomRows) {
    await upsertConversationMember(
      env,
      room.id,
      accountId,
      inheritedRole,
      joinedAt,
    );
  }
}

export async function ensureRestrictedRoomMembership(
  env: Env,
  communityId: string,
  roomId: string,
  accountId: string,
  joinedAt: string,
) {
  const room = await dbFirst<{ id: string; room_access_policy: string | null }>(
    env.DB,
    `SELECT id, room_access_policy
       FROM conversations
      WHERE id = ?1
        AND parent_conversation_id = ?2
        AND kind = 'room'`,
    roomId,
    communityId,
  );

  if (!room) {
    throw new HttpError(404, "Room not found", "ROOM_NOT_FOUND");
  }

  const communityMembership = await dbFirst<{ role: string }>(
    env.DB,
    `SELECT role
       FROM conversation_members
      WHERE conversation_id = ?1
        AND account_id = ?2
        AND removed_at IS NULL`,
    communityId,
    accountId,
  );

  if (!communityMembership) {
    throw new HttpError(
      403,
      "Account is not a community member",
      "COMMUNITY_MEMBERSHIP_REQUIRED",
    );
  }

  if (coerceRoomAccessPolicy(room.room_access_policy) !== "restricted") {
    throw new HttpError(
      409,
      "All-member rooms inherit access from the community",
      "ROOM_ACCESS_INHERITED",
    );
  }

  await upsertConversationMember(
    env,
    roomId,
    accountId,
    normalizeConversationRole(communityMembership.role),
    joinedAt,
  );
}

export async function removeMemberFromCommunityRooms(
  env: Env,
  communityId: string,
  accountId: string,
  removedAt: string,
): Promise<string[]> {
  const roomRows = await dbAll<{ id: string }>(
    env.DB,
    `SELECT id
       FROM conversations
      WHERE parent_conversation_id = ?1
        AND kind = 'room'`,
    communityId,
  );

  await dbRun(
    env.DB,
    `UPDATE conversation_members
        SET removed_at = ?1
      WHERE account_id = ?2
        AND conversation_id IN (
          SELECT id
            FROM conversations
           WHERE parent_conversation_id = ?3
             AND kind = 'room'
        )
        AND removed_at IS NULL`,
    removedAt,
    accountId,
    communityId,
  );

  return roomRows.map((row) => row.id);
}

export async function createCommunityRoom(
  env: Env,
  input: {
    communityId: string;
    createdBy: string;
    title: string;
    joinRuleText?: string | null;
    sensitiveMediaDefault: boolean;
    roomAccessPolicy: RoomAccessPolicy;
    memberAccountIds?: string[];
    createdAt: string;
  },
) {
  const roomId = crypto.randomUUID();
  await dbRun(
    env.DB,
    `INSERT INTO conversations (
       id,
       kind,
       title,
       epoch,
       created_by,
       created_at,
       updated_at,
       parent_conversation_id,
       room_access_policy,
       member_cap,
       sensitive_media_default,
       join_rule_text,
       allow_member_invites,
       history_mode
     ) VALUES (?1, 'room', ?2, 1, ?3, ?4, ?4, ?5, ?6, NULL, ?7, ?8, 0, 'relay_hosted')`,
    roomId,
    input.title,
    input.createdBy,
    input.createdAt,
    input.communityId,
    input.roomAccessPolicy,
    input.sensitiveMediaDefault ? 1 : 0,
    input.joinRuleText ?? null,
  );

  const communityMembers = await dbAll<{ account_id: string; role: string }>(
    env.DB,
    `SELECT account_id, role
       FROM conversation_members
      WHERE conversation_id = ?1
        AND removed_at IS NULL`,
    input.communityId,
  );

  const organizerMemberships = communityMembers.filter((member) =>
    isOrganizerRole(member.role),
  );
  const memberIds =
    input.roomAccessPolicy === "all_members"
      ? communityMembers.map((member) => ({
          accountId: member.account_id,
          role: normalizeConversationRole(member.role),
        }))
      : Array.from(
          new Map([
            ...organizerMemberships.map(
              (member) =>
                [
                  member.account_id,
                  normalizeConversationRole(member.role),
                ] as const,
            ),
            ...(input.memberAccountIds ?? []).map(
              (accountId) => [accountId, "member"] as const,
            ),
          ]).entries(),
        ).map(([accountId, role]) => ({ accountId, role }));

  for (const member of memberIds) {
    await upsertConversationMember(
      env,
      roomId,
      member.accountId,
      member.role,
      input.createdAt,
    );
  }

  await appendConversationMessage(env, {
    conversationId: roomId,
    senderAccountId: input.createdBy,
    kind: "system_notice",
    text: `${input.title} created`,
    createdAt: input.createdAt,
  });

  return roomId;
}

export async function enqueueEnvelope(
  env: Env,
  envelope: CipherEnvelope,
): Promise<{ queued: boolean; code?: string }> {
  const id = env.DEVICE_MAILBOX.idFromName(envelope.recipientDeviceId);
  const stub = env.DEVICE_MAILBOX.get(id);
  const response = await stub.fetch("https://do/enqueue", {
    method: "POST",
    body: JSON.stringify({ envelope }),
  });
  const body = (await response.json()) as { queued: boolean; code?: string };
  return body;
}

export async function loadAccessibleConversations(
  env: Env,
  accountId: string,
  conversationId?: string,
): Promise<LoadedConversation[]> {
  const params: unknown[] = [accountId];
  const conversationFilter =
    conversationId !== undefined
      ? (() => {
          params.push(conversationId);
          return " AND c.id = ?2";
        })()
      : "";

  const rows = await dbAll<{
    id: string;
    kind: RelayConversationKind;
    title: string | null;
    epoch: number;
    history_mode: string | null;
    parent_conversation_id: string | null;
    room_access_policy: string | null;
    member_cap: number | null;
    sensitive_media_default: number | null;
    join_rule_text: string | null;
    allow_member_invites: number | null;
    invite_freeze_enabled: number | null;
    created_at: string;
    updated_at: string | null;
    last_message_at: string | null;
    last_message_kind: string | null;
    my_role: string;
    member_count: number;
    room_count: number;
  }>(
    env.DB,
    `SELECT
       c.id,
       c.kind,
       c.title,
       c.epoch,
       c.history_mode,
       c.parent_conversation_id,
       c.room_access_policy,
       c.member_cap,
       c.sensitive_media_default,
       c.join_rule_text,
       c.allow_member_invites,
       c.invite_freeze_enabled,
       c.created_at,
       c.updated_at,
       c.last_message_at,
       c.last_message_kind,
       cm.role AS my_role,
       (
         SELECT COUNT(*)
           FROM conversation_members members
          WHERE members.conversation_id = c.id
            AND members.removed_at IS NULL
       ) AS member_count,
       (
         SELECT COUNT(*)
           FROM conversations child
           JOIN conversation_members child_members
             ON child_members.conversation_id = child.id
            AND child_members.account_id = ?1
            AND child_members.removed_at IS NULL
          WHERE child.parent_conversation_id = c.id
            AND child.kind = 'room'
       ) AS room_count
     FROM conversations c
     JOIN conversation_members cm
       ON cm.conversation_id = c.id
    WHERE cm.account_id = ?1
      AND cm.removed_at IS NULL${conversationFilter}
    ORDER BY COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC`,
    ...params,
  );

  if (rows.length === 0) {
    return [];
  }

  const conversationIds = rows.map((row) => row.id);
  const memberRows = await dbAll<{
    conversation_id: string;
    account_id: string;
    role: string;
    joined_at: string;
    removed_at: string | null;
    display_name: string;
  }>(
    env.DB,
    `SELECT
       cm.conversation_id,
       cm.account_id,
       cm.role,
       cm.joined_at,
       cm.removed_at,
       a.display_name
     FROM conversation_members cm
     JOIN accounts a ON a.id = cm.account_id
    WHERE cm.conversation_id IN (${sqlPlaceholders(1, conversationIds.length)})`,
    ...conversationIds,
  );

  const membersByConversation = new Map<
    string,
    ConversationDetail["members"]
  >();
  for (const member of memberRows) {
    const list = membersByConversation.get(member.conversation_id) ?? [];
    list.push({
      accountId: member.account_id,
      username: accountUsername(member.account_id),
      displayName: member.display_name,
      role: normalizeConversationRole(member.role),
      joinedAt: member.joined_at,
      removedAt: member.removed_at,
    });
    membersByConversation.set(member.conversation_id, list);
  }

  const requestedConversation = conversationId
    ? rows.find((row) => row.id === conversationId)
    : undefined;
  const roomSummariesByCommunity = new Map<string, ConversationSummary[]>();

  if (requestedConversation?.kind === "community") {
    const roomRows = await dbAll<{
      id: string;
      kind: RelayConversationKind;
      title: string | null;
      epoch: number;
      history_mode: string | null;
      parent_conversation_id: string | null;
      room_access_policy: string | null;
      member_cap: number | null;
      sensitive_media_default: number | null;
      join_rule_text: string | null;
      allow_member_invites: number | null;
      invite_freeze_enabled: number | null;
      created_at: string;
      updated_at: string | null;
      last_message_at: string | null;
      last_message_kind: string | null;
      my_role: string;
      member_count: number;
      room_count: number;
    }>(
      env.DB,
      `SELECT
         c.id,
         c.kind,
         c.title,
         c.epoch,
         c.history_mode,
         c.parent_conversation_id,
         c.room_access_policy,
         c.member_cap,
         c.sensitive_media_default,
         c.join_rule_text,
         c.allow_member_invites,
         c.invite_freeze_enabled,
         c.created_at,
         c.updated_at,
         c.last_message_at,
         c.last_message_kind,
         cm.role AS my_role,
         (
           SELECT COUNT(*)
             FROM conversation_members members
            WHERE members.conversation_id = c.id
              AND members.removed_at IS NULL
         ) AS member_count,
         0 AS room_count
       FROM conversations c
       JOIN conversation_members cm
         ON cm.conversation_id = c.id
      WHERE c.parent_conversation_id = ?1
        AND c.kind = 'room'
        AND cm.account_id = ?2
        AND cm.removed_at IS NULL
      ORDER BY COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC`,
      requestedConversation.id,
      accountId,
    );

    if (roomRows.length > 0) {
      const roomIds = roomRows.map((row) => row.id);
      const roomMemberRows = await dbAll<{
        conversation_id: string;
        account_id: string;
      }>(
        env.DB,
        `SELECT conversation_id, account_id
           FROM conversation_members
          WHERE conversation_id IN (${sqlPlaceholders(1, roomIds.length)})
            AND removed_at IS NULL`,
        ...roomIds,
      );
      const roomMemberAccountIds = new Map<string, string[]>();
      for (const member of roomMemberRows) {
        const list = roomMemberAccountIds.get(member.conversation_id) ?? [];
        list.push(member.account_id);
        roomMemberAccountIds.set(member.conversation_id, list);
      }

      roomSummariesByCommunity.set(
        requestedConversation.id,
        roomRows.map((row) => {
          const memberAccountIds = roomMemberAccountIds.get(row.id) ?? [];
          const historyMode = coerceConversationHistoryMode(
            row.history_mode,
            row.kind,
          );
          return {
            id: row.id,
            kind: row.kind,
            title: row.title ?? defaultConversationTitle(row.kind),
            epoch: row.epoch,
            historyMode,
            parentConversationId: row.parent_conversation_id,
            memberAccountIds,
            memberCount: row.member_count,
            memberCap: row.member_cap ?? undefined,
            sensitiveMediaDefault:
              row.sensitive_media_default === null
                ? undefined
                : Boolean(row.sensitive_media_default),
            joinRuleText: row.join_rule_text,
            allowMemberInvites:
              row.allow_member_invites === null
                ? undefined
                : Boolean(row.allow_member_invites),
            inviteFreezeEnabled:
              row.invite_freeze_enabled === null
                ? undefined
                : Boolean(row.invite_freeze_enabled),
            roomAccessPolicy: coerceRoomAccessPolicy(row.room_access_policy),
            createdAt: row.created_at,
            updatedAt: row.updated_at ?? row.created_at,
            lastMessageAt: row.last_message_at,
            lastMessageKind: row.last_message_kind,
            capabilities: conversationCapabilities({
              kind: row.kind,
              historyMode,
              myRole: row.my_role,
              allowMemberInvites: Boolean(row.allow_member_invites ?? 0),
            }),
          } satisfies ConversationSummary;
        }),
      );
    }
  }

  return rows.map((row) => {
    const members = (membersByConversation.get(row.id) ?? []).filter(
      (member) => !member.removedAt,
    );
    const historyMode = coerceConversationHistoryMode(
      row.history_mode,
      row.kind,
    );
    const memberAccountIds = members.map((member) => member.accountId);
    const dmPeer =
      row.kind === "direct_message"
        ? members.find((member) => member.accountId !== accountId)
        : null;

    return {
      myRole: normalizeConversationRole(row.my_role),
      members,
      rooms: roomSummariesByCommunity.get(row.id),
      summary: {
        id: row.id,
        kind: row.kind,
        title:
          row.kind === "direct_message"
            ? (dmPeer?.displayName ?? row.title ?? "Direct message")
            : (row.title ?? defaultConversationTitle(row.kind)),
        epoch: row.epoch,
        historyMode,
        parentConversationId: row.parent_conversation_id,
        memberAccountIds,
        memberCount: row.member_count,
        roomCount: row.kind === "community" ? row.room_count : undefined,
        memberCap: row.member_cap ?? undefined,
        sensitiveMediaDefault:
          row.sensitive_media_default === null
            ? undefined
            : Boolean(row.sensitive_media_default),
        joinRuleText: row.join_rule_text,
        allowMemberInvites:
          row.allow_member_invites === null
            ? undefined
            : Boolean(row.allow_member_invites),
        inviteFreezeEnabled:
          row.invite_freeze_enabled === null
            ? undefined
            : Boolean(row.invite_freeze_enabled),
        roomAccessPolicy:
          row.kind === "room"
            ? coerceRoomAccessPolicy(row.room_access_policy)
            : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? row.created_at,
        lastMessageAt: row.last_message_at,
        lastMessageKind: row.last_message_kind,
        capabilities: conversationCapabilities({
          kind: row.kind,
          historyMode,
          myRole: row.my_role,
          allowMemberInvites: Boolean(row.allow_member_invites ?? 0),
        }),
      },
    };
  });
}

export function inviteStatusForRow(input: {
  revokedAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  useCount?: number;
  inviteFrozen?: number | boolean | null;
}): "active" | "revoked" | "expired" | "exhausted" | "frozen" {
  if (input.revokedAt) {
    return "revoked";
  }

  if (input.inviteFrozen) {
    return "frozen";
  }

  if (input.expiresAt && input.expiresAt <= new Date().toISOString()) {
    return "expired";
  }

  if (
    input.maxUses !== null &&
    input.maxUses !== undefined &&
    (input.useCount ?? 0) >= input.maxUses
  ) {
    return "exhausted";
  }

  return "active";
}
