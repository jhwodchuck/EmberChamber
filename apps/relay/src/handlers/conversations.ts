import { z } from "zod";
import {
  type ConversationDescriptor,
  type ConversationDetail,
  type ConversationInviteDescriptor,
  type ConversationInvitePreview,
  type ConversationSearchResult,
  type ConversationSummary,
  type GroupInviteDescriptor,
  type GroupInvitePreview,
  type GroupInviteRecord,
  type GroupMembershipSummary,
} from "@emberchamber/protocol";
import {
  requireAuth,
  requireAccessTokenSession,
  parseClientMetadata,
} from "../middleware/auth";
import {
  communityPolicySchema,
  communityRoomSchema,
  communitySchema,
  conversationInviteSchema,
  directMessageSchema,
  groupSchema,
  groupThreadMessageSchema,
  reactionMutationSchema,
} from "../schemas";
import { dbAll, dbFirst, dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import { scheduleCleanup } from "../services/cleanup";
import {
  acceptConversationInviteByTokenHash,
  hashInviteToken,
} from "../services/invites";
import {
  createRelayHostedConversationMessage,
  loadRelayHostedConversationMessages,
  toggleRelayHostedMessageReaction,
} from "../services/messages";
import {
  coerceConversationHistoryMode,
  coerceRoomAccessPolicy,
  conversationHistoryModeForKind,
  createCommunityRoom,
  defaultConversationTitle,
  ensureRestrictedRoomMembership,
  inviteStatusForRow,
  isOrganizerRole,
  listActiveConversationMembers,
  loadAccessibleConversations,
  normalizeConversationRole,
  removeMemberFromCommunityRooms,
  syncRelayHostedConversationSockets,
  upsertConversationMember,
} from "../services/conversations";
import { conversationTitleForAccount, publicWebUrl } from "../services/utils";
import type { Env, RelayConversationKind } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/v1/dm/open") {
    const auth = await requireAuth(request, env);
    const body = directMessageSchema.parse(await readJson(request));

    const blocked = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM blocks
        WHERE (account_id = ?1 AND blocked_account_id = ?2)
           OR (account_id = ?2 AND blocked_account_id = ?1)`,
      auth.accountId,
      body.peerAccountId,
    );

    if (blocked) {
      throw new HttpError(403, "Cannot open DM with this account", "BLOCKED");
    }

    const existing = await dbFirst<{
      conversation_id: string;
      epoch: number;
      created_at: string;
    }>(
      env.DB,
      `SELECT c.id AS conversation_id, c.epoch, c.created_at
         FROM conversations c
         JOIN conversation_members me ON me.conversation_id = c.id AND me.account_id = ?1 AND me.removed_at IS NULL
         JOIN conversation_members peer ON peer.conversation_id = c.id AND peer.account_id = ?2 AND peer.removed_at IS NULL
        WHERE c.kind = 'direct_message'
        LIMIT 1`,
      auth.accountId,
      body.peerAccountId,
    );

    if (existing) {
      const descriptor: ConversationDescriptor = {
        id: existing.conversation_id,
        kind: "direct_message",
        epoch: existing.epoch,
        historyMode: "device_encrypted",
        memberAccountIds: [auth.accountId, body.peerAccountId],
        createdAt: existing.created_at,
      };
      return json(descriptor);
    }

    const conversationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await dbRun(
      env.DB,
      `INSERT INTO conversations (
         id,
         kind,
         epoch,
         created_by,
         created_at,
         updated_at,
         history_mode
       ) VALUES (?1, 'direct_message', 1, ?2, ?3, ?3, 'device_encrypted')`,
      conversationId,
      auth.accountId,
      createdAt,
    );
    await dbRun(
      env.DB,
      `INSERT INTO conversation_members (conversation_id, account_id, role, joined_at)
       VALUES (?1, ?2, 'member', ?4), (?1, ?3, 'member', ?4)`,
      conversationId,
      auth.accountId,
      body.peerAccountId,
      createdAt,
    );

    return json({
      id: conversationId,
      kind: "direct_message",
      epoch: 1,
      historyMode: "device_encrypted",
      memberAccountIds: [auth.accountId, body.peerAccountId],
      createdAt,
    } satisfies ConversationDescriptor);
  }

  if (request.method === "GET" && pathname === "/v1/conversations") {
    const auth = await requireAuth(request, env);
    const conversations = await loadAccessibleConversations(
      env,
      auth.accountId,
    );
    return json(conversations.map((conversation) => conversation.summary));
  }

  const conversationDetailMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "GET" && conversationDetailMatch) {
    const auth = await requireAuth(request, env);
    const [conversation] = await loadAccessibleConversations(
      env,
      auth.accountId,
      conversationDetailMatch[1],
    );

    if (!conversation) {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    return json({
      ...conversation.summary,
      members: conversation.members,
      ...(conversation.rooms ? { rooms: conversation.rooms } : {}),
    } satisfies ConversationDetail);
  }

  if (request.method === "GET" && pathname === "/v1/search") {
    const auth = await requireAuth(request, env);
    const query = (url.searchParams.get("q") ?? "").trim();
    const scopedCommunityId =
      (url.searchParams.get("communityId") ?? "").trim() || null;
    if (query.length < 2) {
      return json({
        query,
        scopedCommunityId: scopedCommunityId ?? undefined,
        conversations: [],
        accounts: [],
      } satisfies ConversationSearchResult);
    }

    const normalizedQuery = query.toLowerCase();
    const conversations = await loadAccessibleConversations(
      env,
      auth.accountId,
    );
    const scopedConversationIds =
      scopedCommunityId === null
        ? null
        : (() => {
            const joinedCommunity = conversations.find(
              (entry) =>
                entry.summary.id === scopedCommunityId &&
                entry.summary.kind === "community",
            );
            if (!joinedCommunity) {
              throw new HttpError(
                404,
                "Scoped community not found",
                "COMMUNITY_NOT_FOUND",
              );
            }

            return new Set(
              conversations
                .filter(
                  (entry) =>
                    entry.summary.id === scopedCommunityId ||
                    entry.summary.parentConversationId === scopedCommunityId,
                )
                .map((entry) => entry.summary.id),
            );
          })();

    const matchingConversations = conversations
      .map((entry) => entry.summary)
      .filter((entry) =>
        scopedConversationIds ? scopedConversationIds.has(entry.id) : true,
      )
      .filter((entry) => {
        const title = (entry.title ?? "").toLowerCase();
        return title.includes(normalizedQuery);
      });

    const accountsById = new Map<
      string,
      {
        accountId: string;
        username: string;
        displayName: string;
        sharedConversationId?: string;
      }
    >();

    for (const conversation of conversations) {
      if (
        scopedConversationIds &&
        !scopedConversationIds.has(conversation.summary.id)
      ) {
        continue;
      }

      for (const member of conversation.members) {
        if (member.accountId === auth.accountId) {
          continue;
        }

        if (
          member.displayName.toLowerCase().includes(normalizedQuery) ||
          member.username.toLowerCase().includes(normalizedQuery)
        ) {
          accountsById.set(member.accountId, {
            accountId: member.accountId,
            username: member.username,
            displayName: member.displayName,
            sharedConversationId:
              conversation.summary.kind === "direct_message"
                ? conversation.summary.id
                : accountsById.get(member.accountId)?.sharedConversationId,
          });
        }
      }
    }

    return json({
      query,
      scopedCommunityId: scopedCommunityId ?? undefined,
      conversations: matchingConversations,
      accounts: Array.from(accountsById.values()).sort((left, right) =>
        left.displayName.localeCompare(right.displayName),
      ),
    } satisfies ConversationSearchResult);
  }

  if (request.method === "POST" && pathname === "/v1/communities") {
    const auth = await requireAuth(request, env);
    const body = communitySchema.parse(await readJson(request));
    if (body.memberAccountIds.length + 1 > body.memberCap) {
      throw new HttpError(
        400,
        "Initial member list exceeds the community cap",
        "GROUP_CAP_EXCEEDED",
      );
    }

    const communityId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const memberAccountIds = Array.from(
      new Set([auth.accountId, ...body.memberAccountIds]),
    );

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
         member_cap,
         sensitive_media_default,
         join_rule_text,
         allow_member_invites,
         history_mode
       ) VALUES (?1, 'community', ?2, 1, ?3, ?4, ?4, ?5, ?6, ?7, ?8, 'relay_hosted')`,
      communityId,
      body.title,
      auth.accountId,
      createdAt,
      body.memberCap,
      body.sensitiveMediaDefault ? 1 : 0,
      body.joinRuleText ?? null,
      body.allowMemberInvites ? 1 : 0,
    );

    for (const [index, memberAccountId] of memberAccountIds.entries()) {
      await upsertConversationMember(
        env,
        communityId,
        memberAccountId,
        index === 0 ? "owner" : "member",
        createdAt,
      );
    }

    const defaultRoomId = await createCommunityRoom(env, {
      communityId,
      createdBy: auth.accountId,
      title: body.defaultRoomTitle,
      joinRuleText: body.joinRuleText ?? null,
      sensitiveMediaDefault: body.sensitiveMediaDefault,
      roomAccessPolicy: "all_members",
      createdAt,
    });

    await syncRelayHostedConversationSockets(env, communityId);
    await syncRelayHostedConversationSockets(env, defaultRoomId);

    return json({
      id: communityId,
      kind: "community",
      title: body.title,
      epoch: 1,
      historyMode: "relay_hosted",
      memberAccountIds,
      memberCount: memberAccountIds.length,
      roomCount: 1,
      memberCap: body.memberCap,
      sensitiveMediaDefault: body.sensitiveMediaDefault,
      joinRuleText: body.joinRuleText ?? null,
      allowMemberInvites: body.allowMemberInvites,
      inviteFreezeEnabled: false,
      createdAt,
    } satisfies ConversationDescriptor);
  }

  const communityPolicyMatch = pathname.match(
    /^\/v1\/communities\/([0-9a-f-]{36})\/policies$/i,
  );
  if (request.method === "PATCH" && communityPolicyMatch) {
    const auth = await requireAuth(request, env);
    const communityId = communityPolicyMatch[1];
    const body = communityPolicySchema.parse(await readJson(request));
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      communityId,
      auth.accountId,
    );

    const community = await dbFirst<{ id: string }>(
      env.DB,
      "SELECT id FROM conversations WHERE id = ?1 AND kind = 'community'",
      communityId,
    );

    if (!membership || !community) {
      throw new HttpError(404, "Community not found", "COMMUNITY_NOT_FOUND");
    }

    if (!isOrganizerRole(membership.role)) {
      throw new HttpError(
        403,
        "Only organizers can update community policies",
        "FORBIDDEN",
      );
    }

    await dbRun(
      env.DB,
      `UPDATE conversations
          SET allow_member_invites = COALESCE(?1, allow_member_invites),
              invite_freeze_enabled = COALESCE(?2, invite_freeze_enabled),
              updated_at = ?3
        WHERE id = ?4`,
      body.allowMemberInvites === undefined
        ? null
        : body.allowMemberInvites
          ? 1
          : 0,
      body.inviteFreezeEnabled === undefined
        ? null
        : body.inviteFreezeEnabled
          ? 1
          : 0,
      new Date().toISOString(),
      communityId,
    );

    const [updated] = await loadAccessibleConversations(
      env,
      auth.accountId,
      communityId,
    );
    if (!updated) {
      throw new HttpError(404, "Community not found", "COMMUNITY_NOT_FOUND");
    }

    return json({
      ...updated.summary,
      members: updated.members,
      ...(updated.rooms ? { rooms: updated.rooms } : {}),
    } satisfies ConversationDetail);
  }

  const communityRoomCreateMatch = pathname.match(
    /^\/v1\/communities\/([0-9a-f-]{36})\/rooms$/i,
  );
  if (request.method === "POST" && communityRoomCreateMatch) {
    const auth = await requireAuth(request, env);
    const communityId = communityRoomCreateMatch[1];
    const body = communityRoomSchema.parse(await readJson(request));
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      communityId,
      auth.accountId,
    );

    if (!membership || !isOrganizerRole(membership.role)) {
      throw new HttpError(
        403,
        "Only organizers can create rooms",
        "FORBIDDEN",
      );
    }

    const community = await dbFirst<{ id: string }>(
      env.DB,
      "SELECT id FROM conversations WHERE id = ?1 AND kind = 'community'",
      communityId,
    );

    if (!community) {
      throw new HttpError(404, "Community not found", "COMMUNITY_NOT_FOUND");
    }

    const communityMembers = await listActiveConversationMembers(
      env,
      communityId,
    );
    const communityMemberIds = new Set(
      communityMembers.map((member) => member.accountId),
    );
    const invalidMembers = body.memberAccountIds.filter(
      (accountId) => !communityMemberIds.has(accountId),
    );
    if (invalidMembers.length > 0) {
      throw new HttpError(
        400,
        "Restricted room members must already belong to the community",
        "FORBIDDEN",
      );
    }

    const createdAt = new Date().toISOString();
    const roomId = await createCommunityRoom(env, {
      communityId,
      createdBy: auth.accountId,
      title: body.title,
      joinRuleText: body.joinRuleText ?? null,
      sensitiveMediaDefault: body.sensitiveMediaDefault,
      roomAccessPolicy: body.roomAccessPolicy,
      memberAccountIds:
        body.roomAccessPolicy === "restricted" ? body.memberAccountIds : [],
      createdAt,
    });

    await syncRelayHostedConversationSockets(env, roomId);

    const [room] = await loadAccessibleConversations(
      env,
      auth.accountId,
      roomId,
    );
    if (!room) {
      throw new HttpError(404, "Room not found", "ROOM_NOT_FOUND");
    }

    return json(room.summary satisfies ConversationSummary);
  }

  const communityRoomMemberAddMatch = pathname.match(
    /^\/v1\/communities\/([0-9a-f-]{36})\/rooms\/([0-9a-f-]{36})\/members\/([0-9a-f-]{36})\/add$/i,
  );
  if (request.method === "POST" && communityRoomMemberAddMatch) {
    const auth = await requireAuth(request, env);
    const communityId = communityRoomMemberAddMatch[1];
    const roomId = communityRoomMemberAddMatch[2];
    const targetAccountId = communityRoomMemberAddMatch[3];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      communityId,
      auth.accountId,
    );

    if (!membership || !isOrganizerRole(membership.role)) {
      throw new HttpError(
        403,
        "Only organizers can grant room access",
        "FORBIDDEN",
      );
    }

    await ensureRestrictedRoomMembership(
      env,
      communityId,
      roomId,
      targetAccountId,
      new Date().toISOString(),
    );
    await syncRelayHostedConversationSockets(env, roomId);
    return json({ added: true, communityId, roomId, targetAccountId });
  }

  const communityRoomMemberRemoveMatch = pathname.match(
    /^\/v1\/communities\/([0-9a-f-]{36})\/rooms\/([0-9a-f-]{36})\/members\/([0-9a-f-]{36})\/remove$/i,
  );
  if (request.method === "POST" && communityRoomMemberRemoveMatch) {
    const auth = await requireAuth(request, env);
    const communityId = communityRoomMemberRemoveMatch[1];
    const roomId = communityRoomMemberRemoveMatch[2];
    const targetAccountId = communityRoomMemberRemoveMatch[3];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      communityId,
      auth.accountId,
    );

    if (!membership || !isOrganizerRole(membership.role)) {
      throw new HttpError(
        403,
        "Only organizers can revoke room access",
        "FORBIDDEN",
      );
    }

    const room = await dbFirst<{ room_access_policy: string | null }>(
      env.DB,
      `SELECT room_access_policy
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

    if (coerceRoomAccessPolicy(room.room_access_policy) !== "restricted") {
      throw new HttpError(
        409,
        "All-member rooms inherit access from the community",
        "ROOM_ACCESS_INHERITED",
      );
    }

    const targetCommunityMembership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      communityId,
      targetAccountId,
    );

    if (
      targetCommunityMembership &&
      isOrganizerRole(targetCommunityMembership.role)
    ) {
      throw new HttpError(
        409,
        "Organizers keep access to restricted rooms",
        "ROOM_ACCESS_REQUIRED",
      );
    }

    await dbRun(
      env.DB,
      `UPDATE conversation_members
          SET removed_at = ?1
        WHERE conversation_id = ?2
          AND account_id = ?3
          AND removed_at IS NULL`,
      new Date().toISOString(),
      roomId,
      targetAccountId,
    );

    await syncRelayHostedConversationSockets(env, roomId);

    return json({ removed: true, communityId, roomId, targetAccountId });
  }

  const communityMemberRemoveMatch = pathname.match(
    /^\/v1\/communities\/([0-9a-f-]{36})\/members\/([0-9a-f-]{36})\/remove$/i,
  );
  if (request.method === "POST" && communityMemberRemoveMatch) {
    const auth = await requireAuth(request, env);
    const communityId = communityMemberRemoveMatch[1];
    const targetAccountId = communityMemberRemoveMatch[2];

    if (targetAccountId === auth.accountId) {
      throw new HttpError(
        400,
        "Use a separate ownership transfer flow before removing yourself",
        "SELF_REMOVE_BLOCKED",
      );
    }

    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      communityId,
      auth.accountId,
    );

    if (!membership || !isOrganizerRole(membership.role)) {
      throw new HttpError(
        403,
        "Only organizers can remove community members",
        "FORBIDDEN",
      );
    }

    const targetMembership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      communityId,
      targetAccountId,
    );

    if (!targetMembership) {
      throw new HttpError(
        404,
        "Community member not found",
        "COMMUNITY_MEMBER_NOT_FOUND",
      );
    }

    if (targetMembership.role === "owner") {
      throw new HttpError(
        409,
        "Transfer ownership before removing the owner",
        "OWNER_REMOVE_BLOCKED",
      );
    }

    const removedAt = new Date().toISOString();
    await dbRun(
      env.DB,
      `UPDATE conversation_members
          SET removed_at = ?1
        WHERE conversation_id = ?2
          AND account_id = ?3
          AND removed_at IS NULL`,
      removedAt,
      communityId,
      targetAccountId,
    );
    const affectedRoomIds = await removeMemberFromCommunityRooms(
      env,
      communityId,
      targetAccountId,
      removedAt,
    );
    await dbRun(
      env.DB,
      `UPDATE conversations
          SET updated_at = ?1
        WHERE id = ?2`,
      removedAt,
      communityId,
    );
    await syncRelayHostedConversationSockets(env, communityId);
    await Promise.all(
      affectedRoomIds.map((roomId) =>
        syncRelayHostedConversationSockets(env, roomId),
      ),
    );

    return json({ removed: true, communityId, targetAccountId });
  }

  if (request.method === "POST" && pathname === "/v1/groups") {
    const auth = await requireAuth(request, env);
    const body = groupSchema.parse(await readJson(request));
    if (body.memberAccountIds.length + 1 > body.memberCap) {
      throw new HttpError(
        400,
        "Initial member list exceeds the group cap",
        "GROUP_CAP_EXCEEDED",
      );
    }
    const conversationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const memberAccountIds = Array.from(
      new Set([auth.accountId, ...body.memberAccountIds]),
    );

    await dbRun(
      env.DB,
      `INSERT INTO conversations (
         id, kind, title, epoch, created_by, created_at, updated_at, member_cap, sensitive_media_default, join_rule_text, allow_member_invites, history_mode
       ) VALUES (?1, 'group', ?2, 1, ?3, ?4, ?4, ?5, ?6, ?7, ?8, 'device_encrypted')`,
      conversationId,
      body.title,
      auth.accountId,
      createdAt,
      body.memberCap,
      body.sensitiveMediaDefault ? 1 : 0,
      body.joinRuleText ?? null,
      0,
    );

    for (const [index, memberAccountId] of memberAccountIds.entries()) {
      await dbRun(
        env.DB,
        "INSERT INTO conversation_members (conversation_id, account_id, role, joined_at) VALUES (?1, ?2, ?3, ?4)",
        conversationId,
        memberAccountId,
        index === 0 ? "owner" : "member",
        createdAt,
      );
    }

    const id = env.GROUP_COORDINATOR.idFromName(conversationId);
    const stub = env.GROUP_COORDINATOR.get(id);
    await stub.fetch("https://do/seed", {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        epoch: 1,
        memberAccountIds,
      }),
    });

    return json({
      id: conversationId,
      kind: "group",
      title: body.title,
      epoch: 1,
      historyMode: "device_encrypted",
      memberAccountIds,
      memberCap: body.memberCap,
      sensitiveMediaDefault: body.sensitiveMediaDefault,
      joinRuleText: body.joinRuleText ?? null,
      allowMemberInvites: false,
      createdAt,
    } satisfies ConversationDescriptor);
  }

  if (request.method === "GET" && pathname === "/v1/groups") {
    const auth = await requireAuth(request, env);
    const rows = await dbAll<{
      id: string;
      title: string | null;
      epoch: number;
      history_mode: string | null;
      member_cap: number | null;
      sensitive_media_default: number | null;
      join_rule_text: string | null;
      allow_member_invites: number | null;
      invite_freeze_enabled: number | null;
      created_at: string;
      updated_at: string;
      role: string;
      member_count: number;
    }>(
      env.DB,
      `SELECT
         c.id,
         c.title,
         c.epoch,
         c.history_mode,
         c.member_cap,
         c.sensitive_media_default,
         c.join_rule_text,
         c.allow_member_invites,
         c.invite_freeze_enabled,
         c.created_at,
         c.updated_at,
         cm.role,
         (
           SELECT COUNT(*)
             FROM conversation_members members
            WHERE members.conversation_id = c.id
              AND members.removed_at IS NULL
         ) AS member_count
       FROM conversations c
       JOIN conversation_members cm
         ON cm.conversation_id = c.id
      WHERE c.kind = 'group'
        AND cm.account_id = ?1
        AND cm.removed_at IS NULL
      ORDER BY c.updated_at DESC`,
      auth.accountId,
    );

    const groups: GroupMembershipSummary[] = rows.map((row) => {
      const allowMemberInvites = false;
      const inviteFreezeEnabled = Boolean(row.invite_freeze_enabled ?? 0);
      const canManageMembers = ["owner", "admin"].includes(row.role);
      const canCreateInvites = canManageMembers;

      return {
        id: row.id,
        title: row.title ?? "Untitled group",
        epoch: row.epoch,
        historyMode: coerceConversationHistoryMode(row.history_mode, "group"),
        memberCount: row.member_count,
        memberCap: row.member_cap ?? 12,
        myRole: ["owner", "admin"].includes(row.role)
          ? (row.role as "owner" | "admin")
          : "member",
        sensitiveMediaDefault: Boolean(row.sensitive_media_default ?? 0),
        joinRuleText: row.join_rule_text,
        allowMemberInvites,
        inviteFreezeEnabled,
        canCreateInvites,
        canManageMembers,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return json(groups);
  }

  const conversationMessagesMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/messages$/i,
  );
  if (request.method === "GET" && conversationMessagesMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationMessagesMatch[1];
    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    const conversation = await dbFirst<{
      id: string;
      kind: RelayConversationKind;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, kind, history_mode FROM conversations WHERE id = ?1",
      conversationId,
    );

    if (!membership || !conversation || conversation.kind === "community") {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    if (
      (conversation.history_mode ??
        conversationHistoryModeForKind(conversation.kind)) !== "relay_hosted"
    ) {
      throw new HttpError(
        409,
        "Relay-hosted history is not available for encrypted conversations.",
        "HISTORY_MODE_UNSUPPORTED",
      );
    }

    const limit = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("limit") ?? "50")),
    );
    return json(
      await loadRelayHostedConversationMessages(
        env,
        conversationId,
        limit,
        auth.accountId,
      ),
    );
  }

  const conversationMessagesAckMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/messages\/ack$/i,
  );
  if (request.method === "POST" && conversationMessagesAckMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationMessagesAckMatch[1];
    const body = z
      .object({ lastReadMessageCreatedAt: z.string() })
      .parse(await readJson(request));
    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const conversation = await dbFirst<{
      id: string;
      kind: RelayConversationKind;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, kind, history_mode FROM conversations WHERE id = ?1",
      conversationId,
    );

    if (!membership || !conversation || conversation.kind === "community") {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    if (
      (conversation.history_mode ??
        conversationHistoryModeForKind(conversation.kind)) !== "relay_hosted"
    ) {
      throw new HttpError(
        409,
        "Relay-hosted history is not available for encrypted conversations.",
        "HISTORY_MODE_UNSUPPORTED",
      );
    }

    const now = new Date().toISOString();
    await dbRun(
      env.DB,
      `INSERT INTO message_reads (conversation_id, account_id, last_read_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (conversation_id, account_id)
         DO UPDATE SET
           last_read_at = MAX(excluded.last_read_at, message_reads.last_read_at),
           updated_at   = ?4`,
      conversationId,
      auth.accountId,
      body.lastReadMessageCreatedAt,
      now,
    );

    return json({ acked: true });
  }

  if (request.method === "POST" && conversationMessagesMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationMessagesMatch[1];
    const body = groupThreadMessageSchema.parse(await readJson(request));
    const normalizedText = body.text?.trim() || "";

    if (!normalizedText && !body.attachmentId) {
      throw new HttpError(
        400,
        "Message needs text or an attachment",
        "MESSAGE_EMPTY",
      );
    }

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const conversation = await dbFirst<{
      id: string;
      kind: RelayConversationKind;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, kind, history_mode FROM conversations WHERE id = ?1",
      conversationId,
    );

    if (!membership || !conversation || conversation.kind === "community") {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    if (
      (conversation.history_mode ??
        conversationHistoryModeForKind(conversation.kind)) !== "relay_hosted"
    ) {
      throw new HttpError(
        409,
        "Relay-hosted history is not available for encrypted conversations.",
        "HISTORY_MODE_UNSUPPORTED",
      );
    }

    return json(
      await createRelayHostedConversationMessage(env, {
        conversationId,
        senderAccountId: auth.accountId,
        senderDeviceId: auth.deviceId,
        text: normalizedText || null,
        attachmentId: body.attachmentId ?? null,
        clientMessageId: body.clientMessageId ?? null,
        replyToMessageId: body.replyToMessageId ?? null,
      }),
      { status: 201 },
    );
  }

  const conversationMessageReactionMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/messages\/([0-9a-f-]{36})\/reactions$/i,
  );
  if (request.method === "POST" && conversationMessageReactionMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationMessageReactionMatch[1];
    const messageId = conversationMessageReactionMatch[2];
    const body = reactionMutationSchema.parse(await readJson(request));

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const conversation = await dbFirst<{
      id: string;
      kind: RelayConversationKind;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, kind, history_mode FROM conversations WHERE id = ?1",
      conversationId,
    );

    if (!membership || !conversation || conversation.kind === "community") {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    if (
      (conversation.history_mode ??
        conversationHistoryModeForKind(conversation.kind)) !== "relay_hosted"
    ) {
      throw new HttpError(
        409,
        "Relay-hosted history is not available for encrypted conversations.",
        "HISTORY_MODE_UNSUPPORTED",
      );
    }

    const reactions = await toggleRelayHostedMessageReaction(env, {
      conversationId,
      messageId,
      accountId: auth.accountId,
      emoji: body.emoji,
    });

    const updatedAt = new Date().toISOString();
    const doId = env.GROUP_COORDINATOR.idFromName(conversationId);
    const stub = env.GROUP_COORDINATOR.get(doId);
    stub
      .fetch("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: "message_reaction",
          conversationId,
          messageId,
          reactions,
          updatedAt,
        }),
      })
      .catch(() => {});

    return json({ updated: true, messageId, reactions, updatedAt });
  }

  const conversationTypingMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/typing\/(start|stop)$/i,
  );
  if (request.method === "POST" && conversationTypingMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationTypingMatch[1];
    const action = conversationTypingMatch[2].toLowerCase();

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const profile = await dbFirst<{ display_name: string | null }>(
      env.DB,
      `SELECT display_name FROM accounts WHERE id = ?1`,
      auth.accountId,
    );

    if (!membership) {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    const timestamp = new Date().toISOString();
    const typingDoId = env.GROUP_COORDINATOR.idFromName(conversationId);
    const typingStub = env.GROUP_COORDINATOR.get(typingDoId);

    typingStub
      .fetch("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify(
          action === "start"
            ? {
                type: "typing_start",
                conversationId,
                accountId: auth.accountId,
                displayName:
                  profile?.display_name ??
                  conversationTitleForAccount(auth.accountId),
                timestamp,
              }
            : {
                type: "typing_stop",
                conversationId,
                accountId: auth.accountId,
                timestamp,
              },
        ),
      })
      .catch(() => {});

    return json({ published: true });
  }

  const conversationWsMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/ws$/i,
  );
  if (
    request.method === "GET" &&
    conversationWsMatch &&
    request.headers.get("Upgrade") === "websocket"
  ) {
    const conversationId = conversationWsMatch[1];
    const token = url.searchParams.get("token");
    if (!token) {
      throw new HttpError(
        401,
        "Missing websocket auth token",
        "INVALID_TOKEN",
      );
    }

    const auth = await requireAccessTokenSession(
      token,
      env,
      parseClientMetadata(request),
    );

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const conversation = await dbFirst<{
      id: string;
      kind: RelayConversationKind;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, kind, history_mode FROM conversations WHERE id = ?1",
      conversationId,
    );
    if (
      !membership ||
      !conversation ||
      conversation.kind === "community" ||
      coerceConversationHistoryMode(
        conversation.history_mode,
        conversation.kind,
      ) !== "relay_hosted"
    ) {
      throw new HttpError(
        403,
        "Not a member of this conversation",
        "FORBIDDEN",
      );
    }

    const doId = env.GROUP_COORDINATOR.idFromName(conversationId);
    const stub = env.GROUP_COORDINATOR.get(doId);
    const upstream = new Request("http://do/ws", request);
    const headers = new Headers(upstream.headers);
    headers.set("x-emberchamber-conversation-id", conversationId);
    headers.set("x-emberchamber-account-id", auth.accountId);
    headers.set("x-emberchamber-device-id", auth.deviceId);
    headers.set("x-emberchamber-session-id", auth.sessionId);
    return stub.fetch(new Request(upstream, { headers }));
  }

  const groupMessagesMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/messages$/i,
  );
  if (request.method === "GET" && groupMessagesMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMessagesMatch[1];
    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    const conversation = await dbFirst<{
      id: string;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, history_mode FROM conversations WHERE id = ?1 AND kind = 'group'",
      conversationId,
    );

    if (!membership || !conversation) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }

    if (
      coerceConversationHistoryMode(conversation.history_mode, "group") !==
      "relay_hosted"
    ) {
      throw new HttpError(
        409,
        "Relay-hosted group history is not available for encrypted groups.",
        "HISTORY_MODE_UNSUPPORTED",
      );
    }

    const limit = Math.max(
      1,
      Math.min(100, Number(url.searchParams.get("limit") ?? "50")),
    );
    return json(
      await loadRelayHostedConversationMessages(
        env,
        conversationId,
        limit,
        auth.accountId,
      ),
    );
  }

  if (request.method === "POST" && groupMessagesMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMessagesMatch[1];
    const body = groupThreadMessageSchema.parse(await readJson(request));
    const normalizedText = body.text?.trim() || "";

    if (!normalizedText && !body.attachmentId) {
      throw new HttpError(
        400,
        "Message needs text or an attachment",
        "MESSAGE_EMPTY",
      );
    }

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const conversation = await dbFirst<{
      id: string;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, history_mode FROM conversations WHERE id = ?1 AND kind = 'group'",
      conversationId,
    );

    if (!membership || !conversation) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }

    if (
      coerceConversationHistoryMode(conversation.history_mode, "group") !==
      "relay_hosted"
    ) {
      throw new HttpError(
        409,
        "Relay-hosted group history is not available for encrypted groups.",
        "HISTORY_MODE_UNSUPPORTED",
      );
    }

    return json(
      await createRelayHostedConversationMessage(env, {
        conversationId,
        senderAccountId: auth.accountId,
        senderDeviceId: auth.deviceId,
        text: normalizedText || null,
        attachmentId: body.attachmentId ?? null,
        clientMessageId: body.clientMessageId ?? null,
        replyToMessageId: body.replyToMessageId ?? null,
      }),
      { status: 201 },
    );
  }

  const groupMessageReactionMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/messages\/([0-9a-f-]{36})\/reactions$/i,
  );
  if (request.method === "POST" && groupMessageReactionMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMessageReactionMatch[1];
    const messageId = groupMessageReactionMatch[2];
    const body = reactionMutationSchema.parse(await readJson(request));

    const membership = await dbFirst<{ account_id: string }>(
      env.DB,
      `SELECT account_id
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const conversation = await dbFirst<{
      id: string;
      history_mode: string | null;
    }>(
      env.DB,
      "SELECT id, history_mode FROM conversations WHERE id = ?1 AND kind = 'group'",
      conversationId,
    );

    if (!membership || !conversation) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }

    if (
      coerceConversationHistoryMode(conversation.history_mode, "group") !==
      "relay_hosted"
    ) {
      throw new HttpError(
        409,
        "Relay-hosted group history is not available for encrypted groups.",
        "HISTORY_MODE_UNSUPPORTED",
      );
    }

    const reactions = await toggleRelayHostedMessageReaction(env, {
      conversationId,
      messageId,
      accountId: auth.accountId,
      emoji: body.emoji,
    });

    const updatedAt = new Date().toISOString();
    const doId = env.GROUP_COORDINATOR.idFromName(conversationId);
    const stub = env.GROUP_COORDINATOR.get(doId);
    stub
      .fetch("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: "message_reaction",
          conversationId,
          messageId,
          reactions,
          updatedAt,
        }),
      })
      .catch(() => {});

    return json({ updated: true, messageId, reactions, updatedAt });
  }

  const groupPatchMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "PATCH" && groupPatchMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupPatchMatch[1];
    const body = z
      .object({
        title: z.string().min(1).max(80).optional(),
        sensitiveMediaDefault: z.boolean().optional(),
      })
      .parse(await readJson(request));

    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role FROM conversation_members WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    if (!membership) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }
    if (!["owner", "admin"].includes(membership.role)) {
      throw new HttpError(
        403,
        "Only owners or admins can update group settings",
        "FORBIDDEN",
      );
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.title !== undefined) {
      values.push(body.title);
      fields.push(`title = ?${values.length}`);
    }
    if (body.sensitiveMediaDefault !== undefined) {
      values.push(body.sensitiveMediaDefault ? 1 : 0);
      fields.push(`sensitive_media_default = ?${values.length}`);
    }
    if (fields.length) {
      values.push(new Date().toISOString());
      fields.push(`updated_at = ?${values.length}`);
      values.push(conversationId);
      const sqlStr = `UPDATE conversations SET ${fields.join(", ")} WHERE id = ?${values.length}`;
      await dbRun(env.DB, sqlStr, ...values);
    }

    return json({ updated: true, conversationId });
  }

  const groupMessagesAckMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/messages\/ack$/i,
  );
  if (request.method === "POST" && groupMessagesAckMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMessagesAckMatch[1];
    const body = z
      .object({ lastReadMessageCreatedAt: z.string() })
      .parse(await readJson(request));

    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role FROM conversation_members WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    if (!membership)
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );

    const now = new Date().toISOString();
    await dbRun(
      env.DB,
      `INSERT INTO message_reads (conversation_id, account_id, last_read_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (conversation_id, account_id)
         DO UPDATE SET
           last_read_at = MAX(excluded.last_read_at, message_reads.last_read_at),
           updated_at   = ?4`,
      conversationId,
      auth.accountId,
      body.lastReadMessageCreatedAt,
      now,
    );

    const ackDoId = env.GROUP_COORDINATOR.idFromName(conversationId);
    const ackStub = env.GROUP_COORDINATOR.get(ackDoId);
    ackStub
      .fetch("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: "read_receipt",
          conversationId,
          accountId: auth.accountId,
          lastReadAt: body.lastReadMessageCreatedAt,
        }),
      })
      .catch(() => {});

    return json({ acked: true });
  }

  const groupMessageDeleteMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/messages\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "DELETE" && groupMessageDeleteMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMessageDeleteMatch[1];
    const messageId = groupMessageDeleteMatch[2];

    const msg = await dbFirst<{
      sender_account_id: string;
      conversation_id: string;
    }>(
      env.DB,
      `SELECT sender_account_id, conversation_id FROM conversation_messages WHERE id = ?1 AND deleted_at IS NULL`,
      messageId,
    );

    if (!msg || msg.conversation_id !== conversationId) {
      throw new HttpError(404, "Message not found", "MESSAGE_NOT_FOUND");
    }
    if (msg.sender_account_id !== auth.accountId) {
      throw new HttpError(
        403,
        "You can only delete your own messages",
        "FORBIDDEN",
      );
    }

    const deletedAt = new Date().toISOString();
    await dbRun(
      env.DB,
      "UPDATE conversation_messages SET deleted_at = ?1 WHERE id = ?2",
      deletedAt,
      messageId,
    );

    const delDoId = env.GROUP_COORDINATOR.idFromName(conversationId);
    const delStub = env.GROUP_COORDINATOR.get(delDoId);
    delStub
      .fetch("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: "message_deleted",
          conversationId,
          messageId,
          deletedAt,
        }),
      })
      .catch(() => {});

    return json({ deleted: true, messageId, deletedAt });
  }

  const groupMessageEditMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/messages\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "PATCH" && groupMessageEditMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMessageEditMatch[1];
    const messageId = groupMessageEditMatch[2];
    const body = z
      .object({ text: z.string().max(2000) })
      .parse(await readJson(request));

    const msg = await dbFirst<{
      sender_account_id: string;
      conversation_id: string;
    }>(
      env.DB,
      `SELECT sender_account_id, conversation_id FROM conversation_messages WHERE id = ?1 AND deleted_at IS NULL`,
      messageId,
    );

    if (!msg || msg.conversation_id !== conversationId) {
      throw new HttpError(404, "Message not found", "MESSAGE_NOT_FOUND");
    }
    if (msg.sender_account_id !== auth.accountId) {
      throw new HttpError(
        403,
        "You can only edit your own messages",
        "FORBIDDEN",
      );
    }

    const editedAt = new Date().toISOString();
    await dbRun(
      env.DB,
      "UPDATE conversation_messages SET body_text = ?1, edited_at = ?2 WHERE id = ?3",
      body.text,
      editedAt,
      messageId,
    );

    const editDoId = env.GROUP_COORDINATOR.idFromName(conversationId);
    const editStub = env.GROUP_COORDINATOR.get(editDoId);
    editStub
      .fetch("http://do/broadcast", {
        method: "POST",
        body: JSON.stringify({
          type: "message_edited",
          conversationId,
          messageId,
          text: body.text,
          editedAt,
        }),
      })
      .catch(() => {});

    return json({ updated: true, messageId, text: body.text, editedAt });
  }

  const groupMembersMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/members$/i,
  );
  if (request.method === "GET" && groupMembersMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMembersMatch[1];

    const membership = await dbFirst<{
      role: string;
      history_mode: string | null;
    }>(
      env.DB,
      `SELECT cm.role, c.history_mode
         FROM conversation_members cm
         JOIN conversations c ON c.id = cm.conversation_id
        WHERE cm.conversation_id = ?1
          AND cm.account_id = ?2
          AND cm.removed_at IS NULL
          AND c.kind = 'group'`,
      conversationId,
      auth.accountId,
    );

    if (!membership) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }

    const isRelayHosted =
      coerceConversationHistoryMode(membership.history_mode, "group") ===
      "relay_hosted";

    const rows = await dbAll<{
      account_id: string;
      display_name: string;
      role: string;
      joined_at: string;
    }>(
      env.DB,
      `SELECT cm.account_id, a.display_name, cm.role, cm.joined_at
         FROM conversation_members cm
         JOIN accounts a ON a.id = cm.account_id
        WHERE cm.conversation_id = ?1
          AND cm.removed_at IS NULL
        ORDER BY
          CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
          cm.joined_at ASC`,
      conversationId,
    );

    const messageCounts = new Map<string, number>();
    if (isRelayHosted) {
      const countRows = await dbAll<{
        sender_account_id: string;
        cnt: number;
      }>(
        env.DB,
        `SELECT sender_account_id, COUNT(*) AS cnt
           FROM conversation_messages
          WHERE conversation_id = ?1
            AND deleted_at IS NULL
          GROUP BY sender_account_id`,
        conversationId,
      );
      for (const cr of countRows) {
        messageCounts.set(cr.sender_account_id, cr.cnt);
      }
    }

    const members = rows.map((row) => ({
      accountId: row.account_id,
      displayName: row.display_name,
      role: normalizeConversationRole(row.role),
      joinedAt: row.joined_at,
      messageCount: messageCounts.get(row.account_id) ?? 0,
    }));

    return json(members);
  }

  const conversationInviteMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/invites$/i,
  );
  if (request.method === "GET" && conversationInviteMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationInviteMatch[1];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const conversation = await dbFirst<{
      kind: "group" | "community";
      invite_freeze_enabled: number | null;
    }>(
      env.DB,
      "SELECT kind, invite_freeze_enabled FROM conversations WHERE id = ?1 AND kind IN ('group', 'community')",
      conversationId,
    );

    if (!membership || !conversation) {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    if (!isOrganizerRole(membership.role)) {
      throw new HttpError(
        403,
        "Only organizers can view invites",
        "FORBIDDEN",
      );
    }

    const rows = await dbAll<{
      id: string;
      conversation_id: string;
      created_by: string;
      created_at: string;
      expires_at: string | null;
      max_uses: number | null;
      use_count: number;
      note: string | null;
      revoked_at: string | null;
      inviter_display_name: string;
      scope: "conversation" | "room";
      target_room_conversation_id: string | null;
      target_room_title: string | null;
    }>(
      env.DB,
      `SELECT
         ci.id,
         ci.conversation_id,
         ci.created_by,
         ci.created_at,
         ci.expires_at,
         ci.max_uses,
         ci.use_count,
         ci.note,
         ci.revoked_at,
         ci.scope,
         ci.target_room_conversation_id,
         inviter.display_name AS inviter_display_name,
         room.title AS target_room_title
       FROM conversation_invites ci
       JOIN accounts inviter ON inviter.id = ci.created_by
       LEFT JOIN conversations room ON room.id = ci.target_room_conversation_id
      WHERE ci.conversation_id = ?1
      ORDER BY ci.created_at DESC`,
      conversationId,
    );

    const invites: ConversationInviteDescriptor[] = rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      conversationKind: conversation.kind,
      scope: row.scope,
      targetRoomConversationId: row.target_room_conversation_id,
      targetRoomTitle: row.target_room_title,
      inviteToken: "",
      inviteUrl: "",
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      useCount: row.use_count,
      note: row.note,
      inviterDisplayName: row.inviter_display_name,
      status: inviteStatusForRow({
        revokedAt: row.revoked_at,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        useCount: row.use_count,
        inviteFrozen: conversation.invite_freeze_enabled,
      }),
    }));

    return json(invites);
  }

  if (request.method === "POST" && conversationInviteMatch) {
    const auth = await requireAuth(request, env);
    const body = conversationInviteSchema.parse(await readJson(request));
    const conversationId = conversationInviteMatch[1];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    const conversation = await dbFirst<{
      kind: "group" | "community";
      allow_member_invites: number | null;
      invite_freeze_enabled: number | null;
    }>(
      env.DB,
      `SELECT kind, allow_member_invites, invite_freeze_enabled
         FROM conversations
        WHERE id = ?1
          AND kind IN ('group', 'community')`,
      conversationId,
    );

    if (!membership || !conversation) {
      throw new HttpError(
        404,
        "Conversation not found",
        "CONVERSATION_NOT_FOUND",
      );
    }

    if (conversation.invite_freeze_enabled) {
      throw new HttpError(
        409,
        "Invites are temporarily frozen",
        "INVITES_FROZEN",
      );
    }

    const organizer = isOrganizerRole(membership.role);
    const memberInvitesEnabled = Boolean(
      conversation.allow_member_invites ?? 0,
    );
    if (
      !organizer &&
      !(conversation.kind === "community" && memberInvitesEnabled)
    ) {
      throw new HttpError(
        403,
        "Only organizers can mint invites right now",
        "FORBIDDEN",
      );
    }

    let targetRoomConversationId: string | null = null;
    let targetRoomTitle: string | null = null;
    if (body.scope === "room") {
      if (conversation.kind !== "community" || !body.roomId) {
        throw new HttpError(
          400,
          "Room-scoped invites need a community and room id",
          "INVALID_INVITE_SCOPE",
        );
      }

      const room = await dbFirst<{ id: string; title: string | null }>(
        env.DB,
        `SELECT id, title
           FROM conversations
          WHERE id = ?1
            AND parent_conversation_id = ?2
            AND kind = 'room'`,
        body.roomId,
        conversationId,
      );

      if (!room) {
        throw new HttpError(404, "Room not found", "ROOM_NOT_FOUND");
      }

      if (!organizer) {
        const roomMembership = await dbFirst<{ account_id: string }>(
          env.DB,
          `SELECT account_id
             FROM conversation_members
            WHERE conversation_id = ?1
              AND account_id = ?2
              AND removed_at IS NULL`,
          room.id,
          auth.accountId,
        );

        if (!roomMembership) {
          throw new HttpError(
            403,
            "Room-scoped invites require room membership",
            "FORBIDDEN",
          );
        }
      }

      targetRoomConversationId = room.id;
      targetRoomTitle = room.title ?? "Untitled room";
    }

    const inviteId = crypto.randomUUID();
    const inviteToken = crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await hashInviteToken(inviteToken);
    const createdAt = new Date().toISOString();
    const expiresAt = body.expiresInHours
      ? new Date(
          Date.now() + body.expiresInHours * 60 * 60 * 1000,
        ).toISOString()
      : null;

    await dbRun(
      env.DB,
      `INSERT INTO conversation_invites (
         id,
         conversation_id,
         token_hash,
         created_by,
         max_uses,
         expires_at,
         created_at,
         note,
         scope,
         target_room_conversation_id
       )
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      inviteId,
      conversationId,
      tokenHash,
      auth.accountId,
      body.maxUses ?? null,
      expiresAt,
      createdAt,
      body.note ?? null,
      body.scope,
      targetRoomConversationId,
    );
    await scheduleCleanup(env, "conversation_invite_create");

    const inviter = await dbFirst<{ display_name: string }>(
      env.DB,
      "SELECT display_name FROM accounts WHERE id = ?1",
      auth.accountId,
    );

    return json({
      id: inviteId,
      conversationId,
      conversationKind: conversation.kind,
      scope: body.scope,
      targetRoomConversationId,
      targetRoomTitle,
      inviteToken,
      inviteUrl: `${publicWebUrl(env)}/invite/${conversationId}/${inviteToken}`,
      createdAt,
      expiresAt,
      maxUses: body.maxUses ?? null,
      useCount: 0,
      note: body.note ?? null,
      inviterDisplayName:
        inviter?.display_name ??
        conversationTitleForAccount(auth.accountId),
      status: "active",
    } satisfies ConversationInviteDescriptor);
  }

  const conversationInvitePreviewMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/invites\/([^/]+)\/preview$/i,
  );
  if (request.method === "GET" && conversationInvitePreviewMatch) {
    const conversationId = conversationInvitePreviewMatch[1];
    const inviteToken = conversationInvitePreviewMatch[2];
    const tokenHash = await hashInviteToken(inviteToken);
    const row = await dbFirst<{
      invite_id: string;
      scope: "conversation" | "room";
      target_room_conversation_id: string | null;
      target_room_title: string | null;
      revoked_at: string | null;
      expires_at: string | null;
      max_uses: number | null;
      use_count: number;
      note: string | null;
      inviter_display_name: string;
      title: string | null;
      kind: "group" | "community";
      member_cap: number | null;
      join_rule_text: string | null;
      sensitive_media_default: number | null;
      allow_member_invites: number | null;
      invite_freeze_enabled: number | null;
      member_count: number;
      room_member_count: number | null;
      room_access_policy: string | null;
    }>(
      env.DB,
      `SELECT
         ci.id AS invite_id,
         ci.scope,
         ci.target_room_conversation_id,
         room.title AS target_room_title,
         room.room_access_policy,
         (
           SELECT COUNT(*)
             FROM conversation_members room_members
            WHERE room_members.conversation_id = room.id
              AND room_members.removed_at IS NULL
         ) AS room_member_count,
         ci.revoked_at,
         ci.expires_at,
         ci.max_uses,
         ci.use_count,
         ci.note,
         inviter.display_name AS inviter_display_name,
         c.title,
         c.kind,
         c.member_cap,
         c.join_rule_text,
         c.sensitive_media_default,
         c.allow_member_invites,
         c.invite_freeze_enabled,
         (
           SELECT COUNT(*)
             FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.removed_at IS NULL
         ) AS member_count
       FROM conversation_invites ci
       JOIN conversations c ON c.id = ci.conversation_id
       JOIN accounts inviter ON inviter.id = ci.created_by
       LEFT JOIN conversations room ON room.id = ci.target_room_conversation_id
      WHERE ci.conversation_id = ?1
        AND ci.token_hash = ?2
        AND c.kind IN ('group', 'community')`,
      conversationId,
      tokenHash,
    );

    if (!row) {
      throw new HttpError(404, "Invite not found", "INVITE_NOT_FOUND");
    }

    const status = inviteStatusForRow({
      revokedAt: row.revoked_at,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      useCount: row.use_count,
      inviteFrozen: row.invite_freeze_enabled,
    });

    return json({
      invite: {
        id: row.invite_id,
        status,
        scope: row.scope,
        inviterDisplayName: row.inviter_display_name,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        useCount: row.use_count,
        note: row.note,
        targetRoomConversationId: row.target_room_conversation_id,
        targetRoomTitle: row.target_room_title,
      },
      conversation: {
        id: conversationId,
        kind: row.kind,
        title: row.title ?? defaultConversationTitle(row.kind),
        memberCount: row.member_count,
        memberCap: row.member_cap ?? (row.kind === "community" ? 150 : 12),
        joinRuleText: row.join_rule_text,
        sensitiveMediaDefault:
          row.sensitive_media_default === null
            ? undefined
            : Boolean(row.sensitive_media_default),
        allowMemberInvites:
          row.allow_member_invites === null
            ? undefined
            : Boolean(row.allow_member_invites),
        inviteFreezeEnabled:
          row.invite_freeze_enabled === null
            ? undefined
            : Boolean(row.invite_freeze_enabled),
      },
      room: row.target_room_conversation_id
        ? {
            id: row.target_room_conversation_id,
            title: row.target_room_title ?? "Untitled room",
            memberCount: row.room_member_count ?? 0,
            roomAccessPolicy: coerceRoomAccessPolicy(row.room_access_policy),
          }
        : null,
    } satisfies ConversationInvitePreview);
  }

  const conversationInviteAcceptMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/invites\/([^/]+)\/accept$/i,
  );
  if (request.method === "POST" && conversationInviteAcceptMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationInviteAcceptMatch[1];
    const inviteToken = conversationInviteAcceptMatch[2];
    const tokenHash = await hashInviteToken(inviteToken);
    return json(
      await acceptConversationInviteByTokenHash(
        env,
        auth.accountId,
        conversationId,
        tokenHash,
      ),
    );
  }

  const conversationInviteDeleteMatch = pathname.match(
    /^\/v1\/conversations\/([0-9a-f-]{36})\/invites\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "DELETE" && conversationInviteDeleteMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = conversationInviteDeleteMatch[1];
    const inviteId = conversationInviteDeleteMatch[2];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1
          AND account_id = ?2
          AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );
    const invite = await dbFirst<{ created_by: string }>(
      env.DB,
      "SELECT created_by FROM conversation_invites WHERE id = ?1 AND conversation_id = ?2",
      inviteId,
      conversationId,
    );

    if (!membership || !invite) {
      throw new HttpError(404, "Invite not found", "INVITE_NOT_FOUND");
    }

    if (
      !isOrganizerRole(membership.role) &&
      invite.created_by !== auth.accountId
    ) {
      throw new HttpError(
        403,
        "Only organizers or the invite creator can revoke invites",
        "FORBIDDEN",
      );
    }

    await dbRun(
      env.DB,
      `UPDATE conversation_invites
          SET revoked_at = ?1
        WHERE id = ?2 AND conversation_id = ?3`,
      new Date().toISOString(),
      inviteId,
      conversationId,
    );

    return json({ revoked: true, inviteId });
  }

  const groupInviteMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/invites$/i,
  );
  if (request.method === "GET" && groupInviteMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupInviteMatch[1];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    const conversation = await dbFirst<{
      invite_freeze_enabled: number;
    }>(
      env.DB,
      "SELECT invite_freeze_enabled FROM conversations WHERE id = ?1 AND kind = 'group'",
      conversationId,
    );

    if (!membership || !conversation) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }

    const canViewInvites = ["owner", "admin"].includes(membership.role);

    if (!canViewInvites) {
      throw new HttpError(
        403,
        "Only owners or admins can view invites",
        "FORBIDDEN",
      );
    }

    const rows = await dbAll<{
      id: string;
      conversation_id: string;
      created_by: string;
      created_at: string;
      expires_at: string | null;
      max_uses: number | null;
      use_count: number;
      note: string | null;
      revoked_at: string | null;
      inviter_display_name: string;
    }>(
      env.DB,
      `SELECT
         ci.id,
         ci.conversation_id,
         ci.created_by,
         ci.created_at,
         ci.expires_at,
         ci.max_uses,
         ci.use_count,
         ci.note,
         ci.revoked_at,
         inviter.display_name AS inviter_display_name
       FROM conversation_invites ci
       JOIN accounts inviter ON inviter.id = ci.created_by
      WHERE ci.conversation_id = ?1
      ORDER BY ci.created_at DESC`,
      conversationId,
    );

    const invites: GroupInviteRecord[] = rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      useCount: row.use_count,
      note: row.note,
      inviterDisplayName: row.inviter_display_name,
      status: inviteStatusForRow({
        revokedAt: row.revoked_at,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        useCount: row.use_count,
        inviteFrozen: conversation.invite_freeze_enabled,
      }),
      createdByCurrentAccount: row.created_by === auth.accountId,
    }));

    return json(invites);
  }

  if (request.method === "POST" && groupInviteMatch) {
    const auth = await requireAuth(request, env);
    const body = conversationInviteSchema.parse(await readJson(request));
    const conversationId = groupInviteMatch[1];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    const conversation = await dbFirst<{
      invite_freeze_enabled: number;
    }>(
      env.DB,
      "SELECT invite_freeze_enabled FROM conversations WHERE id = ?1 AND kind = 'group'",
      conversationId,
    );

    if (!membership || !conversation) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }

    if (conversation.invite_freeze_enabled) {
      throw new HttpError(
        409,
        "Group invites are temporarily frozen",
        "INVITES_FROZEN",
      );
    }

    const canMintInvite = ["owner", "admin"].includes(membership.role);

    if (!canMintInvite) {
      throw new HttpError(
        403,
        "Only owners or admins can mint invites",
        "FORBIDDEN",
      );
    }

    const inviteId = crypto.randomUUID();
    const inviteToken = crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await hashInviteToken(inviteToken);
    const expiresAt = body.expiresInHours
      ? new Date(
          Date.now() + body.expiresInHours * 60 * 60 * 1000,
        ).toISOString()
      : null;

    await dbRun(
      env.DB,
      `INSERT INTO conversation_invites (id, conversation_id, token_hash, created_by, max_uses, expires_at, created_at, note)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      inviteId,
      conversationId,
      tokenHash,
      auth.accountId,
      body.maxUses ?? null,
      expiresAt,
      new Date().toISOString(),
      body.note ?? null,
    );
    await scheduleCleanup(env, "group_invite_create");

    const inviter = await dbFirst<{ display_name: string }>(
      env.DB,
      "SELECT display_name FROM accounts WHERE id = ?1",
      auth.accountId,
    );

    return json({
      id: inviteId,
      conversationId,
      inviteToken,
      inviteUrl: `${publicWebUrl(env)}/invite/${conversationId}/${inviteToken}`,
      inviterDisplayName:
        inviter?.display_name ??
        conversationTitleForAccount(auth.accountId),
      note: body.note ?? null,
      useCount: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      expiresAt,
      maxUses: body.maxUses ?? null,
    } satisfies GroupInviteDescriptor);
  }

  const groupInvitePreviewMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/invites\/([^/]+)\/preview$/i,
  );
  if (request.method === "GET" && groupInvitePreviewMatch) {
    const conversationId = groupInvitePreviewMatch[1];
    const inviteToken = groupInvitePreviewMatch[2];
    const tokenHash = await hashInviteToken(inviteToken);
    const row = await dbFirst<{
      invite_id: string;
      revoked_at: string | null;
      expires_at: string | null;
      max_uses: number | null;
      use_count: number;
      note: string | null;
      inviter_display_name: string;
      title: string | null;
      member_cap: number | null;
      join_rule_text: string | null;
      sensitive_media_default: number | null;
      invite_freeze_enabled: number | null;
      member_count: number;
    }>(
      env.DB,
      `SELECT
         ci.id AS invite_id,
         ci.revoked_at,
         ci.expires_at,
         ci.max_uses,
         ci.use_count,
         ci.note,
         inviter.display_name AS inviter_display_name,
         c.title,
         c.member_cap,
         c.join_rule_text,
         c.sensitive_media_default,
         c.invite_freeze_enabled,
         (
           SELECT COUNT(*)
             FROM conversation_members cm
            WHERE cm.conversation_id = c.id AND cm.removed_at IS NULL
         ) AS member_count
       FROM conversation_invites ci
       JOIN conversations c ON c.id = ci.conversation_id
       JOIN accounts inviter ON inviter.id = ci.created_by
      WHERE ci.conversation_id = ?1 AND ci.token_hash = ?2`,
      conversationId,
      tokenHash,
    );

    if (!row) {
      throw new HttpError(404, "Invite not found", "INVITE_NOT_FOUND");
    }

    const status = inviteStatusForRow({
      revokedAt: row.revoked_at,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      useCount: row.use_count,
      inviteFrozen: row.invite_freeze_enabled,
    });

    return json({
      invite: {
        id: row.invite_id,
        status,
        inviterDisplayName: row.inviter_display_name,
        expiresAt: row.expires_at,
        maxUses: row.max_uses,
        useCount: row.use_count,
        note: row.note,
      },
      group: {
        id: conversationId,
        title: row.title ?? "Untitled group",
        memberCount: row.member_count,
        memberCap: row.member_cap ?? 12,
        joinRuleText: row.join_rule_text,
        sensitiveMediaDefault: Boolean(row.sensitive_media_default ?? 0),
      },
    } satisfies GroupInvitePreview);
  }

  const groupInviteAcceptMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/invites\/([^/]+)\/accept$/i,
  );
  if (request.method === "POST" && groupInviteAcceptMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupInviteAcceptMatch[1];
    const inviteToken = groupInviteAcceptMatch[2];
    const tokenHash = await hashInviteToken(inviteToken);
    const accepted = await acceptConversationInviteByTokenHash(
      env,
      auth.accountId,
      conversationId,
      tokenHash,
    );
    return json({
      conversationId: accepted.conversationId,
      title: accepted.title,
      epoch: accepted.epoch,
    });
  }

  const groupInviteDeleteMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/invites\/([0-9a-f-]{36})$/i,
  );
  if (request.method === "DELETE" && groupInviteDeleteMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupInviteDeleteMatch[1];
    const inviteId = groupInviteDeleteMatch[2];
    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new HttpError(
        403,
        "Only owners or admins can revoke invites",
        "FORBIDDEN",
      );
    }

    await dbRun(
      env.DB,
      `UPDATE conversation_invites
          SET revoked_at = ?1
        WHERE id = ?2 AND conversation_id = ?3`,
      new Date().toISOString(),
      inviteId,
      conversationId,
    );

    return json({ revoked: true, inviteId });
  }

  const groupMemberRemoveMatch = pathname.match(
    /^\/v1\/groups\/([0-9a-f-]{36})\/members\/([0-9a-f-]{36})\/remove$/i,
  );
  if (request.method === "POST" && groupMemberRemoveMatch) {
    const auth = await requireAuth(request, env);
    const conversationId = groupMemberRemoveMatch[1];
    const targetAccountId = groupMemberRemoveMatch[2];
    if (targetAccountId === auth.accountId) {
      throw new HttpError(
        400,
        "Use a separate ownership transfer flow before removing yourself",
        "SELF_REMOVE_BLOCKED",
      );
    }

    const membership = await dbFirst<{ role: string }>(
      env.DB,
      `SELECT role
         FROM conversation_members
        WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
      conversationId,
      auth.accountId,
    );

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new HttpError(
        403,
        "Only owners or admins can remove members",
        "FORBIDDEN",
      );
    }

    const conversation = await dbFirst<{ epoch: number }>(
      env.DB,
      "SELECT epoch FROM conversations WHERE id = ?1 AND kind = 'group'",
      conversationId,
    );

    if (!conversation) {
      throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
    }

    const removedAt = new Date().toISOString();
    const nextEpoch = conversation.epoch + 1;
    await dbRun(
      env.DB,
      `UPDATE conversation_members
          SET removed_at = ?1
        WHERE conversation_id = ?2 AND account_id = ?3 AND removed_at IS NULL`,
      removedAt,
      conversationId,
      targetAccountId,
    );
    await dbRun(
      env.DB,
      `UPDATE conversations
          SET epoch = ?1, updated_at = ?2
        WHERE id = ?3`,
      nextEpoch,
      removedAt,
      conversationId,
    );

    await syncRelayHostedConversationSockets(env, conversationId);

    return json({
      removed: true,
      conversationId,
      targetAccountId,
      epoch: nextEpoch,
    });
  }

  return null;
}
