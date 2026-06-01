import type { ConversationInviteAcceptance } from "@emberchamber/protocol";
import { z } from "zod";
import { sha256Hex } from "../lib/crypto";
import { dbFirst, dbRun } from "../lib/d1";
import { HttpError } from "../lib/http";
import type { Env } from "../types";
import type { authStartSchema } from "../schemas";
import {
  inviteStatusForRow,
  defaultConversationTitle,
  normalizeConversationRole,
  syncCommunityMemberIntoAllMemberRooms,
  upsertConversationMember,
} from "./conversations";
import { appendConversationMessage } from "./messages";

export async function hashInviteToken(token: string): Promise<string> {
  return sha256Hex(`invite:${token}`);
}

export async function requireBetaInvite(
  env: Env,
  inviteToken: string | undefined,
): Promise<string> {
  if (
    inviteToken &&
    env.EMBERCHAMBER_DEV_INVITE_TOKEN &&
    inviteToken === env.EMBERCHAMBER_DEV_INVITE_TOKEN
  ) {
    return await hashInviteToken(inviteToken);
  }

  if (!inviteToken) {
    throw new HttpError(
      403,
      "Invite token required for beta access",
      "INVITE_REQUIRED",
    );
  }

  const tokenHash = await hashInviteToken(inviteToken);
  const invite = await dbFirst<{
    token_hash: string;
    revoked_at: string | null;
    expires_at: string | null;
    max_uses: number | null;
    use_count: number;
  }>(
    env.DB,
    `SELECT token_hash, revoked_at, expires_at, max_uses, use_count
       FROM beta_invites
      WHERE token_hash = ?1`,
    tokenHash,
  );

  if (!invite) {
    throw new HttpError(403, "Invalid beta invite token", "INVALID_INVITE");
  }

  if (invite.revoked_at) {
    throw new HttpError(403, "Invite revoked", "INVITE_REVOKED");
  }

  if (invite.expires_at && invite.expires_at <= new Date().toISOString()) {
    throw new HttpError(403, "Invite expired", "INVITE_EXPIRED");
  }

  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    throw new HttpError(403, "Invite exhausted", "INVITE_EXHAUSTED");
  }

  return tokenHash;
}

export async function validateBootstrapConversationInvite(
  env: Env,
  conversationId: string,
  inviteToken: string,
): Promise<{ conversationId: string; tokenHash: string; title: string }> {
  const tokenHash = await hashInviteToken(inviteToken);
  const invite = await dbFirst<{
    root_title: string | null;
    root_kind: "group" | "community";
    target_room_title: string | null;
    target_room_conversation_id: string | null;
    scope: "conversation" | "room";
    revoked_at: string | null;
    expires_at: string | null;
    max_uses: number | null;
    use_count: number;
    member_cap: number | null;
    invite_freeze_enabled: number | null;
    member_count: number;
  }>(
    env.DB,
    `SELECT
       c.title AS root_title,
       c.kind AS root_kind,
       ci.scope,
       ci.target_room_conversation_id,
       room.title AS target_room_title,
       ci.revoked_at,
       ci.expires_at,
       ci.max_uses,
       ci.use_count,
       c.member_cap,
       c.invite_freeze_enabled,
       (
         SELECT COUNT(*)
           FROM conversation_members cm
         WHERE cm.conversation_id = c.id AND cm.removed_at IS NULL
       ) AS member_count
     FROM conversation_invites ci
     JOIN conversations c ON c.id = ci.conversation_id
     LEFT JOIN conversations room ON room.id = ci.target_room_conversation_id
    WHERE ci.conversation_id = ?1
      AND ci.token_hash = ?2
      AND c.kind IN ('group', 'community')`,
    conversationId,
    tokenHash,
  );

  if (!invite) {
    throw new HttpError(403, "Invalid invite", "INVALID_INVITE");
  }

  const status = inviteStatusForRow({
    revokedAt: invite.revoked_at,
    expiresAt: invite.expires_at,
    maxUses: invite.max_uses,
    useCount: invite.use_count,
    inviteFrozen: invite.invite_freeze_enabled,
  });

  if (status !== "active") {
    throw new HttpError(403, `Invite is ${status}`, "INVITE_UNAVAILABLE");
  }

  if (
    invite.member_count >=
    (invite.member_cap ?? (invite.root_kind === "community" ? 150 : 12))
  ) {
    throw new HttpError(
      409,
      invite.root_kind === "community"
        ? "Community is already at capacity"
        : "Group is already at capacity",
      "GROUP_CAP_EXCEEDED",
    );
  }

  return {
    conversationId,
    tokenHash,
    title:
      invite.scope === "room"
        ? (invite.target_room_title ?? "Untitled room")
        : (invite.root_title ?? defaultConversationTitle(invite.root_kind)),
  };
}

export async function resolveBootstrapAccess(
  env: Env,
  input: z.infer<typeof authStartSchema>,
  accountExists: boolean,
): Promise<{
  betaInviteHash: string | null;
  pendingGroupConversationId: string | null;
  pendingGroupInviteTokenHash: string | null;
}> {
  if (accountExists) {
    return {
      betaInviteHash: null,
      pendingGroupConversationId: null,
      pendingGroupInviteTokenHash: null,
    };
  }

  if (input.inviteToken) {
    return {
      betaInviteHash: await requireBetaInvite(env, input.inviteToken),
      pendingGroupConversationId: null,
      pendingGroupInviteTokenHash: null,
    };
  }

  if (input.groupId || input.groupInviteToken) {
    if (!input.groupId || !input.groupInviteToken) {
      throw new HttpError(
        400,
        "Invite bootstrap needs both conversation id and token",
        "INVALID_INVITE_REFERENCE",
      );
    }

    const invite = await validateBootstrapConversationInvite(
      env,
      input.groupId,
      input.groupInviteToken,
    );
    return {
      betaInviteHash: null,
      pendingGroupConversationId: invite.conversationId,
      pendingGroupInviteTokenHash: invite.tokenHash,
    };
  }

  throw new HttpError(
    403,
    "Invite token required for beta access",
    "INVITE_REQUIRED",
  );
}

export async function acceptConversationInviteByTokenHash(
  env: Env,
  accountId: string,
  conversationId: string,
  tokenHash: string,
): Promise<ConversationInviteAcceptance> {
  const invite = await dbFirst<{
    invite_id: string;
    scope: "conversation" | "room";
    target_room_conversation_id: string | null;
    target_room_title: string | null;
    revoked_at: string | null;
    expires_at: string | null;
    max_uses: number | null;
    use_count: number;
    root_title: string | null;
    root_kind: "group" | "community";
    epoch: number;
    member_cap: number | null;
    invite_freeze_enabled: number | null;
    member_count: number;
  }>(
    env.DB,
    `SELECT
       ci.id AS invite_id,
       ci.scope,
       ci.target_room_conversation_id,
       room.title AS target_room_title,
       ci.revoked_at,
       ci.expires_at,
       ci.max_uses,
       ci.use_count,
       c.title AS root_title,
       c.kind AS root_kind,
       c.epoch,
       c.member_cap,
       c.invite_freeze_enabled,
       (
         SELECT COUNT(*)
           FROM conversation_members cm
          WHERE cm.conversation_id = c.id AND cm.removed_at IS NULL
       ) AS member_count
     FROM conversation_invites ci
     JOIN conversations c ON c.id = ci.conversation_id
     LEFT JOIN conversations room ON room.id = ci.target_room_conversation_id
    WHERE ci.conversation_id = ?1
      AND ci.token_hash = ?2
      AND c.kind IN ('group', 'community')`,
    conversationId,
    tokenHash,
  );

  if (!invite) {
    throw new HttpError(404, "Invite not found", "INVITE_NOT_FOUND");
  }

  const status = inviteStatusForRow({
    revokedAt: invite.revoked_at,
    expiresAt: invite.expires_at,
    maxUses: invite.max_uses,
    useCount: invite.use_count,
    inviteFrozen: invite.invite_freeze_enabled,
  });

  if (status !== "active") {
    throw new HttpError(410, `Invite is ${status}`, "INVITE_UNAVAILABLE");
  }

  const existingRootMember = await dbFirst<{ role: string }>(
    env.DB,
    `SELECT role
       FROM conversation_members
      WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
    conversationId,
    accountId,
  );

  let useRecorded = false;
  const joinedAt = new Date().toISOString();
  if (!existingRootMember) {
    if (
      (invite.member_count ?? 0) >=
      (invite.member_cap ?? (invite.root_kind === "community" ? 150 : 12))
    ) {
      throw new HttpError(
        409,
        invite.root_kind === "community"
          ? "Community is already at capacity"
          : "Group is already at capacity",
        "GROUP_CAP_EXCEEDED",
      );
    }

    await upsertConversationMember(
      env,
      conversationId,
      accountId,
      "member",
      joinedAt,
    );
    useRecorded = true;
    await appendConversationMessage(env, {
      conversationId,
      senderAccountId: accountId,
      kind: "system_notice",
      text:
        invite.root_kind === "community"
          ? "Joined the community"
          : "Joined the group",
      createdAt: joinedAt,
    });
  }

  let targetConversationId = conversationId;
  let title = invite.root_title ?? defaultConversationTitle(invite.root_kind);

  if (invite.root_kind === "community") {
    await syncCommunityMemberIntoAllMemberRooms(
      env,
      conversationId,
      accountId,
      joinedAt,
    );

    if (invite.scope === "room" && invite.target_room_conversation_id) {
      const existingRoomMember = await dbFirst<{ account_id: string }>(
        env.DB,
        `SELECT account_id
           FROM conversation_members
          WHERE conversation_id = ?1
            AND account_id = ?2
            AND removed_at IS NULL`,
        invite.target_room_conversation_id,
        accountId,
      );

      if (!existingRoomMember) {
        await upsertConversationMember(
          env,
          invite.target_room_conversation_id,
          accountId,
          existingRootMember
            ? normalizeConversationRole(existingRootMember.role)
            : "member",
          joinedAt,
        );
        useRecorded = true;
        await appendConversationMessage(env, {
          conversationId: invite.target_room_conversation_id,
          senderAccountId: accountId,
          kind: "system_notice",
          text: "Joined the room",
          createdAt: joinedAt,
        });
      }

      targetConversationId = invite.target_room_conversation_id;
      title = invite.target_room_title ?? "Untitled room";
    }
  }

  if (useRecorded) {
    await dbRun(
      env.DB,
      "UPDATE conversation_invites SET use_count = use_count + 1 WHERE id = ?1",
      invite.invite_id,
    );
  }

  return {
    conversationId: targetConversationId,
    rootConversationId: conversationId,
    rootConversationKind: invite.root_kind,
    title,
    epoch: invite.epoch,
  };
}
