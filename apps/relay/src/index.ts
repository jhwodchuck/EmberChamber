import type {
  AttachmentTicket,
  CipherEnvelope,
  ConversationDescriptor,
  ContactCard,
  DeviceKeyBundle,
  GroupInviteRecord,
  GroupInviteDescriptor,
  GroupMembershipSummary,
  GroupInvitePreview,
  GroupThreadMessage,
  MagicLinkChallenge,
  MeProfile,
  SessionDescriptor,
} from "@emberchamber/protocol";
import { z } from "zod";
import { DeviceMailboxDO } from "./do/device-mailbox";
import { GroupCoordinatorDO } from "./do/group-coordinator";
import { RateLimitDO } from "./do/rate-limit";
import {
  blindIndex,
  decryptString,
  encryptString,
  normalizeEmail,
  sha256Hex,
  signValue,
} from "./lib/crypto";
import { dbAll, dbFirst, dbRun } from "./lib/d1";
import { errorResponse, HttpError, json, preflightResponse, readJson, withCors } from "./lib/http";
import { signAccessToken, verifyAccessToken } from "./lib/tokens";

export interface Env {
  DB: D1Database;
  ATTACHMENTS: R2Bucket;
  DEVICE_MAILBOX: DurableObjectNamespace;
  GROUP_COORDINATOR: DurableObjectNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  EMAIL_QUEUE: Queue<unknown>;
  PUSH_QUEUE: Queue<unknown>;
  CLEANUP_QUEUE: Queue<unknown>;
  EMBERCHAMBER_RELAY_PUBLIC_URL: string;
  EMBERCHAMBER_WEB_PUBLIC_URL?: string;
  EMBERCHAMBER_EMAIL_PROVIDER: string;
  EMBERCHAMBER_EMAIL_FROM: string;
  EMBERCHAMBER_DEV_INVITE_TOKEN?: string;
  EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET: string;
  EMBERCHAMBER_EMAIL_INDEX_SECRET: string;
  EMBERCHAMBER_ACCESS_TOKEN_SECRET: string;
  EMBERCHAMBER_REFRESH_TOKEN_SECRET: string;
  EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET: string;
  EMBERCHAMBER_ALLOWED_ORIGINS: string;
}

interface AuthContext {
  accountId: string;
  deviceId: string;
  sessionId: string;
}

const authStartSchema = z.object({
  email: z.string().email(),
  inviteToken: z.string().min(3).max(128).optional(),
  groupId: z.string().uuid().optional(),
  groupInviteToken: z.string().min(3).max(256).optional(),
  deviceLabel: z.string().min(1).max(64).default("New device"),
});

const authCompleteSchema = z.object({
  completionToken: z.string().min(12),
  deviceLabel: z.string().min(1).max(64).optional(),
});

const deviceRegisterSchema = z.object({
  identityKeyB64: z.string().min(16),
  signedPrekeyB64: z.string().min(16),
  signedPrekeySignatureB64: z.string().min(16),
  oneTimePrekeysB64: z.array(z.string().min(16)).max(100).default([]),
});

const directMessageSchema = z.object({
  peerAccountId: z.string().uuid(),
});

const groupSchema = z.object({
  title: z.string().min(1).max(80),
  memberAccountIds: z.array(z.string().uuid()).max(11).default([]),
  memberCap: z.number().int().min(2).max(12).default(12),
  sensitiveMediaDefault: z.boolean().default(true),
  joinRuleText: z.string().min(1).max(500).optional(),
  allowMemberInvites: z.boolean().default(false),
});

const messageBatchSchema = z.object({
  conversationId: z.string().uuid(),
  epoch: z.number().int().min(1),
  envelopes: z
    .array(
      z.object({
        recipientDeviceId: z.string().uuid(),
        ciphertext: z.string().min(16),
        clientMessageId: z.string().min(8),
        attachmentIds: z.array(z.string()).default([]),
      })
    )
    .min(1)
    .max(200),
});

const mailboxAckSchema = z.object({
  envelopeIds: z.array(z.string().min(8)).min(1).max(200),
});

const attachmentTicketSchema = z.object({
  fileName: z.string().min(1).max(160),
  mimeType: z.string().min(1).max(120),
  byteLength: z.number().int().positive().max(20 * 1024 * 1024),
  sha256B64: z.string().optional(),
  conversationId: z.string().uuid().optional(),
  conversationEpoch: z.number().int().min(1).optional(),
  contentClass: z.enum(["image", "video", "audio", "file"]).default("image"),
  retentionMode: z.enum(["private_vault", "ephemeral"]).default("private_vault"),
  protectionProfile: z.enum(["sensitive_media", "standard"]).default("sensitive_media"),
  previewBlurHash: z.string().max(120).optional(),
});

const reportSchema = z.object({
  targetConversationId: z.string().uuid().optional(),
  targetAccountId: z.string().uuid().optional(),
  targetAttachmentId: z.string().uuid().optional(),
  reason: z.enum([
    "spam",
    "harassment",
    "illegal_content",
    "malware",
    "csam",
    "non_consensual_intimate_media",
    "coercion_or_extortion",
    "impersonation",
    "underage_risk",
    "other",
  ]),
  evidenceMessageIds: z.array(z.string().min(8)).max(25).optional(),
  disclosedPayload: z.record(z.unknown()),
});

const deviceLinkStartSchema = z.object({
  deviceLabel: z.string().min(1).max(64),
});

const deviceLinkConfirmSchema = z.object({
  linkId: z.string().uuid(),
});

const conversationInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(100).optional(),
  expiresInHours: z.number().int().min(1).max(24 * 14).optional(),
  note: z.string().min(1).max(240).optional(),
});

const groupThreadMessageSchema = z.object({
  text: z.string().max(2000).optional(),
  attachmentId: z.string().uuid().optional(),
  clientMessageId: z.string().min(8).max(120).optional(),
});

const profileSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  bio: z.string().max(512).optional(),
});

const privacySettingsSchema = z.object({
  notificationPreviewMode: z.enum(["discreet", "expanded", "none"]).default("discreet"),
  autoDownloadSensitiveMedia: z.boolean().default(false),
  allowSensitiveExport: z.boolean().default(false),
  secureAppSwitcher: z.boolean().default(true),
});

const contactCardSchema = z.object({
  cardToken: z.string().min(8),
});

async function enforceRateLimit(env: Env, key: string, limit: number, windowMs: number): Promise<void> {
  const id = env.RATE_LIMITER.idFromName(key);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch("https://do/check", {
    method: "POST",
    body: JSON.stringify({ key, limit, windowMs }),
  });
  const data = (await response.json()) as { allowed: boolean };
  if (!data.allowed) {
    throw new HttpError(429, "Rate limit exceeded", "RATE_LIMITED");
  }
}

async function requireAuth(request: Request, env: Env): Promise<AuthContext> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token", "UNAUTHENTICATED");
  }

  const payload = await verifyAccessToken(authorization.slice("Bearer ".length), env.EMBERCHAMBER_ACCESS_TOKEN_SECRET);
  if (!payload) {
    throw new HttpError(401, "Invalid access token", "INVALID_ACCESS_TOKEN");
  }

  const session = await dbFirst<{ id: string }>(
    env.DB,
    `SELECT id
       FROM sessions
      WHERE id = ?1
        AND account_id = ?2
        AND device_id = ?3
        AND revoked_at IS NULL
        AND expires_at > ?4`,
    payload.sessionId,
    payload.sub,
    payload.deviceId,
    new Date().toISOString()
  );

  if (!session) {
    throw new HttpError(401, "Session expired", "SESSION_EXPIRED");
  }

  return {
    accountId: payload.sub,
    deviceId: payload.deviceId,
    sessionId: payload.sessionId,
  };
}

async function isExistingAccount(env: Env, emailBlindIndex: string): Promise<boolean> {
  const row = await dbFirst<{ account_id: string }>(
    env.DB,
    "SELECT account_id FROM account_emails WHERE email_blind_index = ?1",
    emailBlindIndex
  );
  return Boolean(row);
}

async function hashInviteToken(token: string): Promise<string> {
  return sha256Hex(`invite:${token}`);
}

async function requireBetaInvite(env: Env, inviteToken: string | undefined): Promise<string> {
  if (inviteToken && env.EMBERCHAMBER_DEV_INVITE_TOKEN && inviteToken === env.EMBERCHAMBER_DEV_INVITE_TOKEN) {
    return await hashInviteToken(inviteToken);
  }

  if (!inviteToken) {
    throw new HttpError(403, "Invite token required for beta access", "INVITE_REQUIRED");
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
    tokenHash
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

async function validateBootstrapGroupInvite(
  env: Env,
  conversationId: string,
  inviteToken: string
): Promise<{ conversationId: string; tokenHash: string; title: string }> {
  const tokenHash = await hashInviteToken(inviteToken);
  const invite = await dbFirst<{
    title: string | null;
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
       c.title,
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
    WHERE ci.conversation_id = ?1
      AND ci.token_hash = ?2
      AND c.kind = 'group'`,
    conversationId,
    tokenHash
  );

  if (!invite) {
    throw new HttpError(403, "Invalid group invite", "INVALID_INVITE");
  }

  const status = inviteStatusForRow({
    revokedAt: invite.revoked_at,
    expiresAt: invite.expires_at,
    maxUses: invite.max_uses,
    useCount: invite.use_count,
    inviteFrozen: invite.invite_freeze_enabled,
  });

  if (status !== "active") {
    throw new HttpError(403, `Group invite is ${status}`, "GROUP_INVITE_UNAVAILABLE");
  }

  if (invite.member_count >= (invite.member_cap ?? 12)) {
    throw new HttpError(409, "Group is already at capacity", "GROUP_CAP_EXCEEDED");
  }

  return {
    conversationId,
    tokenHash,
    title: invite.title ?? "Untitled group",
  };
}

async function resolveBootstrapAccess(
  env: Env,
  input: z.infer<typeof authStartSchema>,
  accountExists: boolean
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
      throw new HttpError(400, "Group invite bootstrap needs both group id and token", "INVALID_INVITE_REFERENCE");
    }

    const invite = await validateBootstrapGroupInvite(env, input.groupId, input.groupInviteToken);
    return {
      betaInviteHash: null,
      pendingGroupConversationId: invite.conversationId,
      pendingGroupInviteTokenHash: invite.tokenHash,
    };
  }

  throw new HttpError(403, "Invite token required for beta access", "INVITE_REQUIRED");
}

async function acceptGroupInviteByTokenHash(
  env: Env,
  accountId: string,
  conversationId: string,
  tokenHash: string
): Promise<{ conversationId: string; title: string; epoch: number }> {
  const invite = await dbFirst<{
    invite_id: string;
    revoked_at: string | null;
    expires_at: string | null;
    max_uses: number | null;
    use_count: number;
    title: string | null;
    epoch: number;
    member_cap: number | null;
    invite_freeze_enabled: number | null;
  }>(
    env.DB,
    `SELECT
       ci.id AS invite_id,
       ci.revoked_at,
       ci.expires_at,
       ci.max_uses,
       ci.use_count,
       c.title,
       c.epoch,
       c.member_cap,
       c.invite_freeze_enabled
     FROM conversation_invites ci
     JOIN conversations c ON c.id = ci.conversation_id
    WHERE ci.conversation_id = ?1
      AND ci.token_hash = ?2
      AND c.kind = 'group'`,
    conversationId,
    tokenHash
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

  const existingMember = await dbFirst<{ account_id: string }>(
    env.DB,
    `SELECT account_id
       FROM conversation_members
      WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
    conversationId,
    accountId
  );

  if (!existingMember) {
    const memberCountRow = await dbFirst<{ member_count: number }>(
      env.DB,
      `SELECT COUNT(*) AS member_count
         FROM conversation_members
        WHERE conversation_id = ?1 AND removed_at IS NULL`,
      conversationId
    );

    if ((memberCountRow?.member_count ?? 0) >= (invite.member_cap ?? 12)) {
      throw new HttpError(409, "Group is already at capacity", "GROUP_CAP_EXCEEDED");
    }

    const joinedAt = new Date().toISOString();
    await dbRun(
      env.DB,
      `INSERT INTO conversation_members (conversation_id, account_id, role, joined_at)
       VALUES (?1, ?2, 'member', ?3)
       ON CONFLICT(conversation_id, account_id) DO UPDATE SET removed_at = NULL, joined_at = excluded.joined_at, role = 'member'`,
      conversationId,
      accountId,
      joinedAt
    );
    await dbRun(
      env.DB,
      "UPDATE conversation_invites SET use_count = use_count + 1 WHERE id = ?1",
      invite.invite_id
    );
    await appendConversationMessage(env, {
      conversationId,
      senderAccountId: accountId,
      kind: "system_notice",
      text: "Joined the group",
      createdAt: joinedAt,
    });
  }

  return {
    conversationId,
    title: invite.title ?? "Untitled group",
    epoch: invite.epoch,
  };
}

async function createSession(
  env: Env,
  accountId: string,
  deviceId: string,
  bootstrapConversation?: { conversationId: string; title: string } | null
) {
  const sessionId = crypto.randomUUID();
  const refreshToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const refreshTokenHash = await sha256Hex(`refresh:${refreshToken}`);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await dbRun(
    env.DB,
    `INSERT INTO sessions (id, account_id, device_id, refresh_token_hash, expires_at, created_at, last_seen_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
    sessionId,
    accountId,
    deviceId,
    refreshTokenHash,
    expiresAt,
    new Date().toISOString()
  );

  const accessToken = await signAccessToken(
    { sub: accountId, deviceId, sessionId },
    env.EMBERCHAMBER_ACCESS_TOKEN_SECRET
  );

  return {
    accountId,
    deviceId,
    sessionId,
    accessToken,
    refreshToken,
    expiresAt,
    passkeyEnrollmentSuggested: true,
    bootstrapConversationId: bootstrapConversation?.conversationId,
    bootstrapConversationTitle: bootstrapConversation?.title,
  };
}

async function parseAttachmentToken(env: Env, token: string, attachmentId: string, action: "upload" | "download") {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    throw new HttpError(401, "Invalid attachment token", "INVALID_ATTACHMENT_TOKEN");
  }

  const expected = await signValue(env.EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET, payload);
  if (expected !== signature) {
    throw new HttpError(401, "Invalid attachment token", "INVALID_ATTACHMENT_TOKEN");
  }

  const data = JSON.parse(atob(payload)) as { attachmentId: string; action: "upload" | "download"; exp: number };
  if (data.attachmentId !== attachmentId || data.action !== action || data.exp <= Date.now()) {
    throw new HttpError(401, "Expired attachment token", "ATTACHMENT_TOKEN_EXPIRED");
  }
}

async function signAttachmentToken(
  env: Env,
  attachmentId: string,
  action: "upload" | "download",
  expiresAtMs: number
): Promise<string> {
  const payload = btoa(JSON.stringify({ attachmentId, action, exp: expiresAtMs }));
  const signature = await signValue(env.EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET, payload);
  return `${payload}.${signature}`;
}

async function appendConversationMessage(
  env: Env,
  input: {
    conversationId: string;
    senderAccountId: string;
    kind: "text" | "media" | "system_notice";
    text?: string | null;
    attachmentId?: string | null;
    clientMessageId?: string | null;
    createdAt?: string;
  }
) {
  const messageId = crypto.randomUUID();
  const createdAt = input.createdAt ?? new Date().toISOString();

  await dbRun(
    env.DB,
    `INSERT INTO conversation_messages (
       id,
       conversation_id,
       sender_account_id,
       kind,
       body_text,
       attachment_id,
       client_message_id,
       created_at
     )
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    messageId,
    input.conversationId,
    input.senderAccountId,
    input.kind,
    input.text ?? null,
    input.attachmentId ?? null,
    input.clientMessageId ?? null,
    createdAt
  );

  await dbRun(
    env.DB,
    "UPDATE conversations SET updated_at = ?1 WHERE id = ?2",
    createdAt,
    input.conversationId
  );

  return {
    id: messageId,
    createdAt,
  };
}

async function enqueueEnvelope(env: Env, envelope: CipherEnvelope): Promise<void> {
  const id = env.DEVICE_MAILBOX.idFromName(envelope.recipientDeviceId);
  const stub = env.DEVICE_MAILBOX.get(id);
  await stub.fetch("https://do/enqueue", {
    method: "POST",
    body: JSON.stringify({ envelope }),
  });
}

function conversationTitleForAccount(accountId: string): string {
  return `Member ${accountId.slice(0, 8)}`;
}

function accountUsername(accountId: string): string {
  return `member-${accountId.slice(0, 8)}`;
}

function publicWebUrl(env: Env): string {
  return (env.EMBERCHAMBER_WEB_PUBLIC_URL ?? env.EMBERCHAMBER_RELAY_PUBLIC_URL).replace(/\/$/, "");
}

function inviteStatusForRow(input: {
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

  if (input.maxUses !== null && input.maxUses !== undefined && (input.useCount ?? 0) >= input.maxUses) {
    return "exhausted";
  }

  return "active";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return preflightResponse(request, env.EMBERCHAMBER_ALLOWED_ORIGINS);
      }

      const respond = (response: Response) =>
        withCors(response, request, env.EMBERCHAMBER_ALLOWED_ORIGINS);

      const url = new URL(request.url);
      const pathname = url.pathname;

      if (request.method === "GET" && pathname === "/health") {
        return respond(
          json({
            status: "ok",
            relay: "cloudflare-workers",
            timestamp: new Date().toISOString(),
          })
        );
      }

      if (request.method === "GET" && pathname === "/auth/complete") {
        const token = url.searchParams.get("token");
        if (!token) {
          throw new HttpError(400, "Missing completion token", "MISSING_COMPLETION_TOKEN");
        }

        const redirectUrl = `${publicWebUrl(env)}/auth/complete?token=${encodeURIComponent(token)}`;
        return Response.redirect(redirectUrl, 302);
      }

      if (request.method === "POST" && pathname === "/v1/auth/start") {
        const body = authStartSchema.parse(await readJson(request));
        const email = normalizeEmail(body.email);
        const emailBlindIndex = await blindIndex(env.EMBERCHAMBER_EMAIL_INDEX_SECRET, email);
        const ip = request.headers.get("cf-connecting-ip") ?? "local";

        await enforceRateLimit(env, `auth:start:${ip}`, 10, 15 * 60 * 1000);
        await enforceRateLimit(env, `auth:start:email:${emailBlindIndex}`, 5, 15 * 60 * 1000);

        const accountExists = await isExistingAccount(env, emailBlindIndex);
        const bootstrapAccess = await resolveBootstrapAccess(env, body, accountExists);

        const challengeId = crypto.randomUUID();
        const completionToken = `${challengeId}.${crypto.randomUUID()}`;
        const completionTokenHash = await sha256Hex(`completion:${completionToken}`);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const emailCiphertext = await encryptString(env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET, email);

        await dbRun(
          env.DB,
          `INSERT INTO auth_challenges (
            id, email_ciphertext, email_blind_index, invite_token_hash, completion_token_hash, expires_at, created_at, requested_device_label, pending_group_conversation_id, pending_group_invite_token_hash
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
          challengeId,
          emailCiphertext,
          emailBlindIndex,
          bootstrapAccess.betaInviteHash,
          completionTokenHash,
          expiresAt,
          new Date().toISOString(),
          body.deviceLabel,
          bootstrapAccess.pendingGroupConversationId,
          bootstrapAccess.pendingGroupInviteTokenHash
        );

        await env.EMAIL_QUEUE.send({
          type: "magic_link",
          to: email,
          from: env.EMBERCHAMBER_EMAIL_FROM,
          completionUrl: `${publicWebUrl(env)}/auth/complete?token=${encodeURIComponent(completionToken)}`,
          expiresAt,
        });

        const response: MagicLinkChallenge = {
          id: challengeId,
          expiresAt,
          inviteRequired: !accountExists,
          ...(env.EMBERCHAMBER_EMAIL_PROVIDER === "log" ? { debugCompletionToken: completionToken } : {}),
        };

        return respond(json(response, { status: 202 }));
      }

      if (request.method === "POST" && pathname === "/v1/auth/complete") {
        const body = authCompleteSchema.parse(await readJson(request));
        const completionTokenHash = await sha256Hex(`completion:${body.completionToken}`);
        const challenge = await dbFirst<{
          id: string;
          email_ciphertext: string;
          email_blind_index: string;
          invite_token_hash: string | null;
          pending_group_conversation_id: string | null;
          pending_group_invite_token_hash: string | null;
          expires_at: string;
          consumed_at: string | null;
          requested_device_label: string | null;
        }>(
          env.DB,
          `SELECT id, email_ciphertext, email_blind_index, invite_token_hash, pending_group_conversation_id, pending_group_invite_token_hash, expires_at, consumed_at, requested_device_label
             FROM auth_challenges
            WHERE completion_token_hash = ?1`,
          completionTokenHash
        );

        if (!challenge || challenge.consumed_at || challenge.expires_at <= new Date().toISOString()) {
          throw new HttpError(410, "Magic link expired or already used", "MAGIC_LINK_INVALID");
        }

        let account = await dbFirst<{ account_id: string }>(
          env.DB,
          "SELECT account_id FROM account_emails WHERE email_blind_index = ?1",
          challenge.email_blind_index
        );

        if (!account) {
          const accountId = crypto.randomUUID();
          const now = new Date().toISOString();
          await dbRun(
            env.DB,
            "INSERT INTO accounts (id, display_name, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            accountId,
            conversationTitleForAccount(accountId),
            now
          );
          await dbRun(
            env.DB,
            "INSERT INTO account_emails (account_id, email_ciphertext, email_blind_index, created_at) VALUES (?1, ?2, ?3, ?4)",
            accountId,
            challenge.email_ciphertext,
            challenge.email_blind_index,
            now
          );

          if (challenge.invite_token_hash) {
            await dbRun(
              env.DB,
              "UPDATE beta_invites SET use_count = use_count + 1 WHERE token_hash = ?1",
              challenge.invite_token_hash
            );
          }

          account = { account_id: accountId };
        }

        const bootstrapConversation =
          challenge.pending_group_conversation_id && challenge.pending_group_invite_token_hash
            ? await acceptGroupInviteByTokenHash(
                env,
                account.account_id,
                challenge.pending_group_conversation_id,
                challenge.pending_group_invite_token_hash
              )
            : null;

        const deviceId = crypto.randomUUID();
        const deviceLabel = body.deviceLabel ?? challenge.requested_device_label ?? "Primary device";
        await dbRun(
          env.DB,
          "INSERT INTO devices (id, account_id, device_label, created_at) VALUES (?1, ?2, ?3, ?4)",
          deviceId,
          account.account_id,
          deviceLabel,
          new Date().toISOString()
        );
        await dbRun(
          env.DB,
          "UPDATE auth_challenges SET consumed_at = ?1 WHERE id = ?2",
          new Date().toISOString(),
          challenge.id
        );

        return respond(
          json(
            await createSession(env, account.account_id, deviceId, bootstrapConversation)
          )
        );
      }

      if (request.method === "POST" && pathname === "/v1/auth/refresh") {
        const body = z.object({ refreshToken: z.string().min(16) }).parse(await readJson(request));
        const refreshTokenHash = await sha256Hex(`refresh:${body.refreshToken}`);
        const session = await dbFirst<{
          id: string;
          account_id: string;
          device_id: string;
          expires_at: string;
          revoked_at: string | null;
        }>(
          env.DB,
          `SELECT id, account_id, device_id, expires_at, revoked_at
             FROM sessions
            WHERE refresh_token_hash = ?1`,
          refreshTokenHash
        );

        if (!session || session.revoked_at || session.expires_at <= new Date().toISOString()) {
          throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
        }

        const accessToken = await signAccessToken(
          {
            sub: session.account_id,
            deviceId: session.device_id,
            sessionId: session.id,
          },
          env.EMBERCHAMBER_ACCESS_TOKEN_SECRET
        );

        return respond(
          json({
          accessToken,
          sessionId: session.id,
          deviceId: session.device_id,
          })
        );
      }

      if (
        request.method === "POST" &&
        [
          "/v1/passkeys/register/options",
          "/v1/passkeys/register/verify",
          "/v1/passkeys/auth/options",
          "/v1/passkeys/auth/verify",
        ].includes(pathname)
      ) {
        return respond(
          json(
            {
              supported: false,
              message:
                "Passkey enrollment is scaffolded in the protocol, but not yet wired in this beta relay.",
            },
            { status: 501 }
          )
        );
      }

      if (request.method === "GET" && pathname === "/v1/me") {
        const auth = await requireAuth(request, env);
        const account = await dbFirst<{
          display_name: string;
          bio: string | null;
          email_ciphertext: string;
        }>(
          env.DB,
          `SELECT a.display_name, a.bio, ae.email_ciphertext
             FROM accounts a
             JOIN account_emails ae ON ae.account_id = a.id
            WHERE a.id = ?1`,
          auth.accountId
        );

        if (!account) {
          throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
        }

        const profile: MeProfile = {
          id: auth.accountId,
          username: accountUsername(auth.accountId),
          displayName: account.display_name,
          email: await decryptString(env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET, account.email_ciphertext),
          bio: account.bio ?? undefined,
        };

        return respond(json(profile));
      }

      if (request.method === "PATCH" && pathname === "/v1/me") {
        const auth = await requireAuth(request, env);
        const body = profileSchema.parse(await readJson(request));
        const existing = await dbFirst<{ display_name: string; bio: string | null }>(
          env.DB,
          "SELECT display_name, bio FROM accounts WHERE id = ?1",
          auth.accountId
        );

        if (!existing) {
          throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
        }

        const displayName = body.displayName ?? existing.display_name;
        const bio = body.bio ?? existing.bio;
        await dbRun(
          env.DB,
          "UPDATE accounts SET display_name = ?1, bio = ?2, updated_at = ?3 WHERE id = ?4",
          displayName,
          bio ?? null,
          new Date().toISOString(),
          auth.accountId
        );

        return respond(json({ updated: true, displayName, bio: bio ?? null }));
      }

      if (request.method === "GET" && pathname === "/v1/me/privacy") {
        const auth = await requireAuth(request, env);
        const settings = await dbFirst<{
          notification_preview_mode: string | null;
          auto_download_sensitive_media: number | null;
          allow_sensitive_export: number | null;
          secure_app_switcher: number | null;
        }>(
          env.DB,
          `SELECT notification_preview_mode, auto_download_sensitive_media, allow_sensitive_export, secure_app_switcher
             FROM accounts
            WHERE id = ?1`,
          auth.accountId
        );

        if (!settings) {
          throw new HttpError(404, "Account not found", "ACCOUNT_NOT_FOUND");
        }

        return respond(
          json({
            notificationPreviewMode: settings.notification_preview_mode ?? "discreet",
            autoDownloadSensitiveMedia: Boolean(settings.auto_download_sensitive_media ?? 0),
            allowSensitiveExport: Boolean(settings.allow_sensitive_export ?? 0),
            secureAppSwitcher: Boolean(settings.secure_app_switcher ?? 1),
          })
        );
      }

      if (request.method === "PATCH" && pathname === "/v1/me/privacy") {
        const auth = await requireAuth(request, env);
        const body = privacySettingsSchema.parse(await readJson(request));
        await dbRun(
          env.DB,
          `UPDATE accounts
              SET notification_preview_mode = ?1,
                  auto_download_sensitive_media = ?2,
                  allow_sensitive_export = ?3,
                  secure_app_switcher = ?4,
                  updated_at = ?5
            WHERE id = ?6`,
          body.notificationPreviewMode,
          body.autoDownloadSensitiveMedia ? 1 : 0,
          body.allowSensitiveExport ? 1 : 0,
          body.secureAppSwitcher ? 1 : 0,
          new Date().toISOString(),
          auth.accountId
        );

        return respond(json(body));
      }

      if (request.method === "GET" && pathname === "/v1/sessions") {
        const auth = await requireAuth(request, env);
        const rows = await dbAll<{
          id: string;
          device_label: string;
          created_at: string;
          last_seen_at: string;
        }>(
          env.DB,
          `SELECT s.id, d.device_label, s.created_at, s.last_seen_at
             FROM sessions s
             JOIN devices d ON d.id = s.device_id
            WHERE s.account_id = ?1
              AND s.revoked_at IS NULL
              AND s.expires_at > ?2
            ORDER BY s.last_seen_at DESC`,
          auth.accountId,
          new Date().toISOString()
        );

        const sessions: SessionDescriptor[] = rows.map((row) => ({
          id: row.id,
          deviceLabel: row.device_label,
          createdAt: row.created_at,
          lastSeenAt: row.last_seen_at,
          isCurrent: row.id === auth.sessionId,
        }));

        return respond(json(sessions));
      }

      const sessionDeleteMatch = pathname.match(/^\/v1\/sessions\/([0-9a-f-]{36})$/i);
      if (request.method === "DELETE" && sessionDeleteMatch) {
        const auth = await requireAuth(request, env);
        const sessionId = sessionDeleteMatch[1];
        await dbRun(
          env.DB,
          `UPDATE sessions
              SET revoked_at = ?1
            WHERE id = ?2 AND account_id = ?3`,
          new Date().toISOString(),
          sessionId,
          auth.accountId
        );

        return respond(json({ revoked: true, sessionId }));
      }

      if (request.method === "POST" && pathname === "/v1/devices/register") {
        const auth = await requireAuth(request, env);
        const body = deviceRegisterSchema.parse(await readJson(request));

        await dbRun(
          env.DB,
          `UPDATE devices
              SET public_identity_key = ?1,
                  signed_prekey = ?2,
                  signed_prekey_signature = ?3,
                  one_time_prekeys_json = ?4,
                  verified_at = COALESCE(verified_at, ?5)
            WHERE id = ?6 AND account_id = ?7`,
          body.identityKeyB64,
          body.signedPrekeyB64,
          body.signedPrekeySignatureB64,
          JSON.stringify(body.oneTimePrekeysB64),
          new Date().toISOString(),
          auth.deviceId,
          auth.accountId
        );

        return respond(json({ registered: true, deviceId: auth.deviceId }));
      }

      if (request.method === "POST" && pathname === "/v1/devices/link/start") {
        const auth = await requireAuth(request, env);
        const body = deviceLinkStartSchema.parse(await readJson(request));
        const linkId = crypto.randomUUID();
        const linkToken = `${linkId}.${crypto.randomUUID()}`;
        const tokenHash = await sha256Hex(`device-link:${linkToken}`);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await dbRun(
          env.DB,
          `INSERT INTO device_links (id, account_id, requester_label, link_token_hash, created_at, expires_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
          linkId,
          auth.accountId,
          body.deviceLabel,
          tokenHash,
          new Date().toISOString(),
          expiresAt
        );

        return respond(
          json({
            linkId,
            qrPayload: linkToken,
            expiresAt,
          })
        );
      }

      if (request.method === "POST" && pathname === "/v1/devices/link/confirm") {
        const auth = await requireAuth(request, env);
        const body = deviceLinkConfirmSchema.parse(await readJson(request));

        await dbRun(
          env.DB,
          `UPDATE device_links
              SET approved_at = ?1, approved_by_device_id = ?2
            WHERE id = ?3 AND account_id = ?4`,
          new Date().toISOString(),
          auth.deviceId,
          body.linkId,
          auth.accountId
        );

        return respond(json({ confirmed: true, linkId: body.linkId }));
      }

      if (request.method === "POST" && pathname === "/v1/contacts/card/resolve") {
        await requireAuth(request, env);
        const body = contactCardSchema.parse(await readJson(request));
        const decoded = JSON.parse(atob(body.cardToken)) as ContactCard;
        const account = await dbFirst<{ id: string }>(env.DB, "SELECT id FROM accounts WHERE id = ?1", decoded.accountId);

        if (!account) {
          throw new HttpError(404, "Contact card not found", "CONTACT_NOT_FOUND");
        }

        return respond(json(decoded));
      }

      if (request.method === "GET" && pathname === "/v1/me/contact-card") {
        const auth = await requireAuth(request, env);
        const account = await dbFirst<{ display_name: string }>(
          env.DB,
          "SELECT display_name FROM accounts WHERE id = ?1",
          auth.accountId
        );

        const card: ContactCard = {
          accountId: auth.accountId,
          label: account?.display_name ?? conversationTitleForAccount(auth.accountId),
        };

        return respond(
          json({
            ...card,
            cardToken: btoa(JSON.stringify(card)),
          })
        );
      }

      const accountDeviceBundlesMatch = pathname.match(/^\/v1\/accounts\/([0-9a-f-]{36})\/device-bundles$/i);
      if (request.method === "GET" && accountDeviceBundlesMatch) {
        const auth = await requireAuth(request, env);
        const targetAccountId = accountDeviceBundlesMatch[1];

        if (targetAccountId !== auth.accountId) {
          const sharedConversation = await dbFirst<{ conversation_id: string }>(
            env.DB,
            `SELECT me.conversation_id
               FROM conversation_members me
               JOIN conversation_members peer
                 ON peer.conversation_id = me.conversation_id
                AND peer.account_id = ?2
                AND peer.removed_at IS NULL
              WHERE me.account_id = ?1
                AND me.removed_at IS NULL
              LIMIT 1`,
            auth.accountId,
            targetAccountId
          );

          if (!sharedConversation) {
            throw new HttpError(403, "No shared conversation with this account", "FORBIDDEN");
          }
        }

        const rows = await dbAll<{
          id: string;
          device_label: string;
          public_identity_key: string;
          signed_prekey: string;
          signed_prekey_signature: string;
          one_time_prekeys_json: string | null;
          uploaded_at: string;
        }>(
          env.DB,
          `SELECT
             id,
             device_label,
             public_identity_key,
             signed_prekey,
             signed_prekey_signature,
             one_time_prekeys_json,
             COALESCE(verified_at, created_at) AS uploaded_at
           FROM devices
          WHERE account_id = ?1
            AND revoked_at IS NULL
            AND public_identity_key IS NOT NULL
            AND signed_prekey IS NOT NULL
            AND signed_prekey_signature IS NOT NULL
          ORDER BY created_at ASC`,
          targetAccountId
        );

        const bundles: DeviceKeyBundle[] = rows.map((row) => ({
          accountId: targetAccountId,
          deviceId: row.id,
          deviceLabel: row.device_label,
          uploadedAt: row.uploaded_at,
          bundle: {
            identityKeyB64: row.public_identity_key,
            signedPrekeyB64: row.signed_prekey,
            signedPrekeySignatureB64: row.signed_prekey_signature,
            oneTimePrekeysB64: row.one_time_prekeys_json
              ? (JSON.parse(row.one_time_prekeys_json) as string[])
              : [],
          },
        }));

        return respond(json(bundles));
      }

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
          body.peerAccountId
        );

        if (blocked) {
          throw new HttpError(403, "Cannot open DM with this account", "BLOCKED");
        }

        const existing = await dbFirst<{ conversation_id: string; epoch: number; created_at: string }>(
          env.DB,
          `SELECT c.id AS conversation_id, c.epoch, c.created_at
             FROM conversations c
             JOIN conversation_members me ON me.conversation_id = c.id AND me.account_id = ?1 AND me.removed_at IS NULL
             JOIN conversation_members peer ON peer.conversation_id = c.id AND peer.account_id = ?2 AND peer.removed_at IS NULL
            WHERE c.kind = 'direct_message'
            LIMIT 1`,
          auth.accountId,
          body.peerAccountId
        );

        if (existing) {
          const descriptor: ConversationDescriptor = {
            id: existing.conversation_id,
            kind: "direct_message",
            epoch: existing.epoch,
            memberAccountIds: [auth.accountId, body.peerAccountId],
            createdAt: existing.created_at,
          };
          return respond(json(descriptor));
        }

        const conversationId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        await dbRun(
          env.DB,
          "INSERT INTO conversations (id, kind, epoch, created_by, created_at) VALUES (?1, 'direct_message', 1, ?2, ?3)",
          conversationId,
          auth.accountId,
          createdAt
        );
        await dbRun(
          env.DB,
          `INSERT INTO conversation_members (conversation_id, account_id, role, joined_at)
           VALUES (?1, ?2, 'member', ?4), (?1, ?3, 'member', ?4)`,
          conversationId,
          auth.accountId,
          body.peerAccountId,
          createdAt
        );

        return respond(
          json({
            id: conversationId,
            kind: "direct_message",
            epoch: 1,
            memberAccountIds: [auth.accountId, body.peerAccountId],
            createdAt,
          } satisfies ConversationDescriptor)
        );
      }

      if (request.method === "POST" && pathname === "/v1/groups") {
        const auth = await requireAuth(request, env);
        const body = groupSchema.parse(await readJson(request));
        if (body.memberAccountIds.length + 1 > body.memberCap) {
          throw new HttpError(400, "Initial member list exceeds the group cap", "GROUP_CAP_EXCEEDED");
        }
        const conversationId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const memberAccountIds = Array.from(new Set([auth.accountId, ...body.memberAccountIds]));

        await dbRun(
          env.DB,
          `INSERT INTO conversations (
             id, kind, title, epoch, created_by, created_at, updated_at, member_cap, sensitive_media_default, join_rule_text, allow_member_invites
           ) VALUES (?1, 'group', ?2, 1, ?3, ?4, ?4, ?5, ?6, ?7, ?8)`,
          conversationId,
          body.title,
          auth.accountId,
          createdAt,
          body.memberCap,
          body.sensitiveMediaDefault ? 1 : 0,
          body.joinRuleText ?? null,
          body.allowMemberInvites ? 1 : 0
        );

        for (const [index, memberAccountId] of memberAccountIds.entries()) {
          await dbRun(
            env.DB,
            "INSERT INTO conversation_members (conversation_id, account_id, role, joined_at) VALUES (?1, ?2, ?3, ?4)",
            conversationId,
            memberAccountId,
            index === 0 ? "owner" : "member",
            createdAt
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

        await appendConversationMessage(env, {
          conversationId,
          senderAccountId: auth.accountId,
          kind: "system_notice",
          text: `${body.title} created`,
          clientMessageId: null,
          createdAt,
        });

        return respond(
          json({
            id: conversationId,
            kind: "group",
            title: body.title,
            epoch: 1,
            memberAccountIds,
            memberCap: body.memberCap,
            sensitiveMediaDefault: body.sensitiveMediaDefault,
            joinRuleText: body.joinRuleText ?? null,
            allowMemberInvites: body.allowMemberInvites,
            createdAt,
          } satisfies ConversationDescriptor)
        );
      }

      if (request.method === "GET" && pathname === "/v1/groups") {
        const auth = await requireAuth(request, env);
        const rows = await dbAll<{
          id: string;
          title: string | null;
          epoch: number;
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
          auth.accountId
        );

        const groups: GroupMembershipSummary[] = rows.map((row) => {
          const allowMemberInvites = Boolean(row.allow_member_invites ?? 0);
          const inviteFreezeEnabled = Boolean(row.invite_freeze_enabled ?? 0);
          const canManageMembers = ["owner", "admin"].includes(row.role);
          const canCreateInvites = canManageMembers || (row.role === "member" && allowMemberInvites);

          return {
            id: row.id,
            title: row.title ?? "Untitled group",
            epoch: row.epoch,
            memberCount: row.member_count,
            memberCap: row.member_cap ?? 12,
            myRole: ["owner", "admin"].includes(row.role) ? (row.role as "owner" | "admin") : "member",
            sensitiveMediaDefault: Boolean(row.sensitive_media_default ?? 1),
            joinRuleText: row.join_rule_text,
            allowMemberInvites,
            inviteFreezeEnabled,
            canCreateInvites,
            canManageMembers,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        });

        return respond(json(groups));
      }

      const groupMessagesMatch = pathname.match(/^\/v1\/groups\/([0-9a-f-]{36})\/messages$/i);
      if (request.method === "GET" && groupMessagesMatch) {
        const auth = await requireAuth(request, env);
        const conversationId = groupMessagesMatch[1];
        const membership = await dbFirst<{ account_id: string }>(
          env.DB,
          `SELECT account_id
             FROM conversation_members
            WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
          conversationId,
          auth.accountId
        );

        const conversation = await dbFirst<{ id: string }>(
          env.DB,
          "SELECT id FROM conversations WHERE id = ?1 AND kind = 'group'",
          conversationId
        );

        if (!membership || !conversation) {
          throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
        }

        const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") ?? "50")));
        const rows = await dbAll<{
          id: string;
          conversation_id: string;
          sender_account_id: string;
          sender_display_name: string;
          kind: "text" | "media" | "system_notice";
          body_text: string | null;
          created_at: string;
          attachment_id: string | null;
          file_name: string | null;
          mime_type: string | null;
          byte_length: number | null;
          content_class: "image" | "video" | "audio" | "file" | null;
          retention_mode: "private_vault" | "ephemeral" | null;
          protection_profile: "sensitive_media" | "standard" | null;
          preview_blur_hash: string | null;
        }>(
          env.DB,
          `SELECT
             m.id,
             m.conversation_id,
             m.sender_account_id,
             sender.display_name AS sender_display_name,
             m.kind,
             m.body_text,
             m.created_at,
             a.id AS attachment_id,
             a.file_name,
             a.mime_type,
             a.byte_length,
             a.content_class,
             a.retention_mode,
             a.protection_profile,
             a.preview_blur_hash
           FROM conversation_messages m
           JOIN accounts sender ON sender.id = m.sender_account_id
           LEFT JOIN attachments a ON a.id = m.attachment_id
          WHERE m.conversation_id = ?1
            AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT ?2`,
          conversationId,
          limit
        );

        const expiresAtMs = Date.now() + 30 * 60 * 1000;
        const messages: GroupThreadMessage[] = [];

        for (const row of rows.reverse()) {
          const attachment =
            row.attachment_id && row.file_name && row.mime_type && row.byte_length !== null && row.content_class && row.retention_mode && row.protection_profile
              ? {
                  id: row.attachment_id,
                  downloadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${row.attachment_id}?token=${encodeURIComponent(
                    await signAttachmentToken(env, row.attachment_id, "download", expiresAtMs)
                  )}`,
                  fileName: row.file_name,
                  mimeType: row.mime_type,
                  byteLength: row.byte_length,
                  contentClass: row.content_class,
                  retentionMode: row.retention_mode,
                  protectionProfile: row.protection_profile,
                  previewBlurHash: row.preview_blur_hash,
                }
              : null;

          messages.push({
            id: row.id,
            conversationId: row.conversation_id,
            senderAccountId: row.sender_account_id,
            senderDisplayName: row.sender_display_name,
            kind: row.kind,
            text: row.body_text,
            attachment,
            createdAt: row.created_at,
          });
        }

        return respond(json(messages));
      }

      if (request.method === "POST" && groupMessagesMatch) {
        const auth = await requireAuth(request, env);
        const conversationId = groupMessagesMatch[1];
        const body = groupThreadMessageSchema.parse(await readJson(request));
        const normalizedText = body.text?.trim() || "";

        if (!normalizedText && !body.attachmentId) {
          throw new HttpError(400, "Message needs text or an attachment", "MESSAGE_EMPTY");
        }

        const membership = await dbFirst<{ account_id: string }>(
          env.DB,
          `SELECT account_id
             FROM conversation_members
            WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
          conversationId,
          auth.accountId
        );
        const sender = await dbFirst<{ display_name: string }>(
          env.DB,
          "SELECT display_name FROM accounts WHERE id = ?1",
          auth.accountId
        );

        const conversation = await dbFirst<{ id: string }>(
          env.DB,
          "SELECT id FROM conversations WHERE id = ?1 AND kind = 'group'",
          conversationId
        );

        if (!membership || !conversation) {
          throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
        }

        let attachment:
          | {
              id: string;
              file_name: string;
              mime_type: string;
              byte_length: number;
              content_class: "image" | "video" | "audio" | "file";
              retention_mode: "private_vault" | "ephemeral";
              protection_profile: "sensitive_media" | "standard";
              preview_blur_hash: string | null;
              account_id: string;
              conversation_id: string | null;
            }
          | null = null;

        if (body.attachmentId) {
          attachment = await dbFirst<{
            id: string;
            file_name: string;
            mime_type: string;
            byte_length: number;
            content_class: "image" | "video" | "audio" | "file";
            retention_mode: "private_vault" | "ephemeral";
            protection_profile: "sensitive_media" | "standard";
            preview_blur_hash: string | null;
            account_id: string;
            conversation_id: string | null;
          }>(
            env.DB,
            `SELECT
               id,
               file_name,
               mime_type,
               byte_length,
               content_class,
               retention_mode,
               protection_profile,
               preview_blur_hash,
               account_id,
               conversation_id
             FROM attachments
            WHERE id = ?1`,
            body.attachmentId
          );

          if (!attachment || attachment.account_id !== auth.accountId || attachment.conversation_id !== conversationId) {
            throw new HttpError(403, "Attachment is not available for this group message", "FORBIDDEN");
          }
        }

        const created = await appendConversationMessage(env, {
          conversationId,
          senderAccountId: auth.accountId,
          kind: attachment ? "media" : "text",
          text: normalizedText || null,
          attachmentId: attachment?.id ?? null,
          clientMessageId: body.clientMessageId ?? null,
        });

        const expiresAtMs = Date.now() + 30 * 60 * 1000;
        const message: GroupThreadMessage = {
          id: created.id,
          conversationId,
          senderAccountId: auth.accountId,
          senderDisplayName: sender?.display_name ?? conversationTitleForAccount(auth.accountId),
          kind: attachment ? "media" : "text",
          text: normalizedText || null,
          attachment: attachment
            ? {
                id: attachment.id,
                downloadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${attachment.id}?token=${encodeURIComponent(
                  await signAttachmentToken(env, attachment.id, "download", expiresAtMs)
                )}`,
                fileName: attachment.file_name,
                mimeType: attachment.mime_type,
                byteLength: attachment.byte_length,
                contentClass: attachment.content_class,
                retentionMode: attachment.retention_mode,
                protectionProfile: attachment.protection_profile,
                previewBlurHash: attachment.preview_blur_hash,
              }
            : null,
          createdAt: created.createdAt,
        };

        return respond(json(message, { status: 201 }));
      }

      const groupInviteMatch = pathname.match(/^\/v1\/groups\/([0-9a-f-]{36})\/invites$/i);
      if (request.method === "GET" && groupInviteMatch) {
        const auth = await requireAuth(request, env);
        const conversationId = groupInviteMatch[1];
        const membership = await dbFirst<{ role: string }>(
          env.DB,
          `SELECT role
             FROM conversation_members
            WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
          conversationId,
          auth.accountId
        );

        const conversation = await dbFirst<{
          invite_freeze_enabled: number;
          allow_member_invites: number;
        }>(
          env.DB,
          "SELECT invite_freeze_enabled, allow_member_invites FROM conversations WHERE id = ?1 AND kind = 'group'",
          conversationId
        );

        if (!membership || !conversation) {
          throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
        }

        const canViewInvites =
          ["owner", "admin"].includes(membership.role) ||
          (membership.role === "member" && Boolean(conversation.allow_member_invites));

        if (!canViewInvites) {
          throw new HttpError(403, "Only approved members can view invites", "FORBIDDEN");
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
          conversationId
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

        return respond(json(invites));
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
          auth.accountId
        );

        const conversation = await dbFirst<{
          invite_freeze_enabled: number;
          allow_member_invites: number;
        }>(
          env.DB,
          "SELECT invite_freeze_enabled, allow_member_invites FROM conversations WHERE id = ?1 AND kind = 'group'",
          conversationId
        );

        if (!membership || !conversation) {
          throw new HttpError(404, "Group not found", "GROUP_NOT_FOUND");
        }

        if (conversation.invite_freeze_enabled) {
          throw new HttpError(409, "Group invites are temporarily frozen", "INVITES_FROZEN");
        }

        const canMintInvite =
          ["owner", "admin"].includes(membership.role) ||
          (membership.role === "member" && Boolean(conversation.allow_member_invites));

        if (!canMintInvite) {
          throw new HttpError(403, "Only approved members can mint invites", "FORBIDDEN");
        }

        const inviteId = crypto.randomUUID();
        const inviteToken = crypto.randomUUID().replace(/-/g, "");
        const tokenHash = await hashInviteToken(inviteToken);
        const expiresAt = body.expiresInHours
          ? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000).toISOString()
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
          body.note ?? null
        );

        const inviter = await dbFirst<{ display_name: string }>(
          env.DB,
          "SELECT display_name FROM accounts WHERE id = ?1",
          auth.accountId
        );

        return respond(
          json({
            id: inviteId,
            conversationId,
            inviteToken,
            inviteUrl: `${publicWebUrl(env)}/invite/${conversationId}/${inviteToken}`,
            inviterDisplayName: inviter?.display_name ?? conversationTitleForAccount(auth.accountId),
            note: body.note ?? null,
            useCount: 0,
            status: "active",
            createdAt: new Date().toISOString(),
            expiresAt,
            maxUses: body.maxUses ?? null,
          } satisfies GroupInviteDescriptor)
        );
      }

      const groupInvitePreviewMatch = pathname.match(/^\/v1\/groups\/([0-9a-f-]{36})\/invites\/([^/]+)\/preview$/i);
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
          tokenHash
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

        return respond(
          json({
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
              sensitiveMediaDefault: Boolean(row.sensitive_media_default ?? 1),
            },
          } satisfies GroupInvitePreview)
        );
      }

      const groupInviteAcceptMatch = pathname.match(/^\/v1\/groups\/([0-9a-f-]{36})\/invites\/([^/]+)\/accept$/i);
      if (request.method === "POST" && groupInviteAcceptMatch) {
        const auth = await requireAuth(request, env);
        const conversationId = groupInviteAcceptMatch[1];
        const inviteToken = groupInviteAcceptMatch[2];
        const tokenHash = await hashInviteToken(inviteToken);
        return respond(json(await acceptGroupInviteByTokenHash(env, auth.accountId, conversationId, tokenHash)));
      }

      const groupInviteDeleteMatch = pathname.match(/^\/v1\/groups\/([0-9a-f-]{36})\/invites\/([0-9a-f-]{36})$/i);
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
          auth.accountId
        );

        if (!membership || !["owner", "admin"].includes(membership.role)) {
          throw new HttpError(403, "Only owners or admins can revoke invites", "FORBIDDEN");
        }

        await dbRun(
          env.DB,
          `UPDATE conversation_invites
              SET revoked_at = ?1
            WHERE id = ?2 AND conversation_id = ?3`,
          new Date().toISOString(),
          inviteId,
          conversationId
        );

        return respond(json({ revoked: true, inviteId }));
      }

      const groupMemberRemoveMatch = pathname.match(/^\/v1\/groups\/([0-9a-f-]{36})\/members\/([0-9a-f-]{36})\/remove$/i);
      if (request.method === "POST" && groupMemberRemoveMatch) {
        const auth = await requireAuth(request, env);
        const conversationId = groupMemberRemoveMatch[1];
        const targetAccountId = groupMemberRemoveMatch[2];
        if (targetAccountId === auth.accountId) {
          throw new HttpError(400, "Use a separate ownership transfer flow before removing yourself", "SELF_REMOVE_BLOCKED");
        }

        const membership = await dbFirst<{ role: string }>(
          env.DB,
          `SELECT role
             FROM conversation_members
            WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
          conversationId,
          auth.accountId
        );

        if (!membership || !["owner", "admin"].includes(membership.role)) {
          throw new HttpError(403, "Only owners or admins can remove members", "FORBIDDEN");
        }

        const conversation = await dbFirst<{ epoch: number }>(
          env.DB,
          "SELECT epoch FROM conversations WHERE id = ?1 AND kind = 'group'",
          conversationId
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
          targetAccountId
        );
        await dbRun(
          env.DB,
          `UPDATE conversations
              SET epoch = ?1, updated_at = ?2
            WHERE id = ?3`,
          nextEpoch,
          removedAt,
          conversationId
        );

        const memberRows = await dbAll<{ account_id: string }>(
          env.DB,
          "SELECT account_id FROM conversation_members WHERE conversation_id = ?1 AND removed_at IS NULL",
          conversationId
        );
        const id = env.GROUP_COORDINATOR.idFromName(conversationId);
        const stub = env.GROUP_COORDINATOR.get(id);
        await stub.fetch("https://do/rotate", {
          method: "POST",
          body: JSON.stringify({
            conversationId,
            epoch: nextEpoch,
            memberAccountIds: memberRows.map((row) => row.account_id),
          }),
        });

        return respond(json({ removed: true, conversationId, targetAccountId, epoch: nextEpoch }));
      }

      if (request.method === "POST" && pathname === "/v1/messages/batch") {
        const auth = await requireAuth(request, env);
        const body = messageBatchSchema.parse(await readJson(request));
        const conversation = await dbFirst<{ kind: "direct_message" | "group"; epoch: number }>(
          env.DB,
          "SELECT kind, epoch FROM conversations WHERE id = ?1",
          body.conversationId
        );

        if (!conversation) {
          throw new HttpError(404, "Conversation not found", "CONVERSATION_NOT_FOUND");
        }

        const membership = await dbFirst<{ account_id: string }>(
          env.DB,
          `SELECT account_id
             FROM conversation_members
            WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
          body.conversationId,
          auth.accountId
        );

        if (!membership) {
          throw new HttpError(403, "Not a member of this conversation", "FORBIDDEN");
        }

        if (conversation.epoch !== body.epoch) {
          throw new HttpError(409, "Conversation epoch changed", "STALE_EPOCH");
        }

        const devices = await dbAll<{ id: string; account_id: string }>(
          env.DB,
          "SELECT id, account_id FROM devices WHERE revoked_at IS NULL"
        );
        const deviceMap = new Map(devices.map((device) => [device.id, device]));
        const memberRows = await dbAll<{ account_id: string }>(
          env.DB,
          "SELECT account_id FROM conversation_members WHERE conversation_id = ?1 AND removed_at IS NULL",
          body.conversationId
        );
        const memberSet = new Set(memberRows.map((row) => row.account_id));

        const accepted: string[] = [];
        for (const item of body.envelopes) {
          const recipient = deviceMap.get(item.recipientDeviceId);
          if (!recipient || !memberSet.has(recipient.account_id)) {
            continue;
          }

          const blocked = await dbFirst<{ account_id: string }>(
            env.DB,
            `SELECT account_id
               FROM blocks
              WHERE account_id = ?1 AND blocked_account_id = ?2`,
            recipient.account_id,
            auth.accountId
          );
          if (blocked) {
            continue;
          }

          const envelope: CipherEnvelope = {
            envelopeId: crypto.randomUUID(),
            conversationId: body.conversationId,
            epoch: body.epoch,
            senderAccountId: auth.accountId,
            senderDeviceId: auth.deviceId,
            recipientDeviceId: item.recipientDeviceId,
            ciphertext: item.ciphertext,
            attachmentIds: item.attachmentIds,
            clientMessageId: item.clientMessageId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          };

          await enqueueEnvelope(env, envelope);
          accepted.push(envelope.envelopeId);
        }

        return respond(json({ acceptedEnvelopeIds: accepted }, { status: 202 }));
      }

      if (request.method === "GET" && pathname === "/v1/mailbox/sync") {
        const auth = await requireAuth(request, env);
        const id = env.DEVICE_MAILBOX.idFromName(auth.deviceId);
        const stub = env.DEVICE_MAILBOX.get(id);
        const after = url.searchParams.get("after");
        const limit = url.searchParams.get("limit") ?? "50";
        return respond(
          await stub.fetch(
            `https://do/sync?after=${encodeURIComponent(after ?? "")}&limit=${encodeURIComponent(limit)}`
          )
        );
      }

      if (request.method === "POST" && pathname === "/v1/mailbox/ack") {
        const auth = await requireAuth(request, env);
        const body = mailboxAckSchema.parse(await readJson(request));
        const id = env.DEVICE_MAILBOX.idFromName(auth.deviceId);
        const stub = env.DEVICE_MAILBOX.get(id);
        return respond(
          await stub.fetch("https://do/ack", {
            method: "POST",
            body: JSON.stringify(body),
          })
        );
      }

      if (request.method === "POST" && pathname === "/v1/attachments/ticket") {
        const auth = await requireAuth(request, env);
        const body = attachmentTicketSchema.parse(await readJson(request));
        const attachmentId = crypto.randomUUID();
        const r2Key = `${auth.accountId}/${attachmentId}/${body.fileName}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        if (body.conversationId) {
          const conversation = await dbFirst<{ epoch: number }>(
            env.DB,
            `SELECT epoch
               FROM conversations
              WHERE id = ?1`,
            body.conversationId
          );
          const membership = await dbFirst<{ account_id: string }>(
            env.DB,
            `SELECT account_id
               FROM conversation_members
              WHERE conversation_id = ?1 AND account_id = ?2 AND removed_at IS NULL`,
            body.conversationId,
            auth.accountId
          );

          if (!conversation || !membership) {
            throw new HttpError(403, "Not allowed to attach media to this conversation", "FORBIDDEN");
          }

          if (body.conversationEpoch && conversation.epoch !== body.conversationEpoch) {
            throw new HttpError(409, "Conversation epoch changed", "STALE_EPOCH");
          }
        }

        await dbRun(
          env.DB,
          `INSERT INTO attachments (
             id,
             account_id,
             r2_key,
             file_name,
             mime_type,
             byte_length,
             sha256_b64,
             created_at,
             last_accessed_at,
             expires_at,
             content_class,
             retention_mode,
             protection_profile,
             preview_blur_hash,
             conversation_id,
             conversation_epoch
           )
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
          attachmentId,
          auth.accountId,
          r2Key,
          body.fileName,
          body.mimeType,
          body.byteLength,
          body.sha256B64 ?? null,
          new Date().toISOString(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          body.contentClass,
          body.retentionMode,
          body.protectionProfile,
          body.previewBlurHash ?? null,
          body.conversationId ?? null,
          body.conversationEpoch ?? null
        );

        const uploadToken = await signAttachmentToken(env, attachmentId, "upload", expiresAt.getTime());
        const downloadToken = await signAttachmentToken(env, attachmentId, "download", expiresAt.getTime());

        const response: AttachmentTicket = {
          attachmentId,
          uploadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/upload/${attachmentId}?token=${encodeURIComponent(uploadToken)}`,
          downloadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${attachmentId}?token=${encodeURIComponent(downloadToken)}`,
          expiresAt: expiresAt.toISOString(),
          maxBytes: body.byteLength,
          contentClass: body.contentClass,
          retentionMode: body.retentionMode,
          protectionProfile: body.protectionProfile,
          previewBlurHash: body.previewBlurHash,
        };
        return respond(json(response, { status: 201 }));
      }

      const attachmentUploadMatch = pathname.match(/^\/v1\/attachments\/upload\/([0-9a-f-]{36})$/i);
      if (request.method === "PUT" && attachmentUploadMatch) {
        const attachmentId = attachmentUploadMatch[1];
        const token = url.searchParams.get("token");
        if (!token) {
          throw new HttpError(401, "Missing attachment token", "INVALID_ATTACHMENT_TOKEN");
        }
        await parseAttachmentToken(env, token, attachmentId, "upload");

        const attachment = await dbFirst<{ r2_key: string; mime_type: string }>(
          env.DB,
          "SELECT r2_key, mime_type FROM attachments WHERE id = ?1",
          attachmentId
        );

        if (!attachment) {
          throw new HttpError(404, "Attachment ticket not found", "ATTACHMENT_NOT_FOUND");
        }

        await env.ATTACHMENTS.put(attachment.r2_key, await request.arrayBuffer(), {
          httpMetadata: { contentType: attachment.mime_type },
        });

        return respond(json({ uploaded: true }));
      }

      const attachmentDownloadMatch = pathname.match(/^\/v1\/attachments\/download\/([0-9a-f-]{36})$/i);
      if (request.method === "GET" && attachmentDownloadMatch) {
        const attachmentId = attachmentDownloadMatch[1];
        const token = url.searchParams.get("token");
        if (!token) {
          throw new HttpError(401, "Missing attachment token", "INVALID_ATTACHMENT_TOKEN");
        }
        await parseAttachmentToken(env, token, attachmentId, "download");

        const attachment = await dbFirst<{ r2_key: string; mime_type: string }>(
          env.DB,
          "SELECT r2_key, mime_type FROM attachments WHERE id = ?1",
          attachmentId
        );

        if (!attachment) {
          throw new HttpError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
        }

        const object = await env.ATTACHMENTS.get(attachment.r2_key);
        if (!object) {
          throw new HttpError(404, "Encrypted attachment blob not found", "ATTACHMENT_BLOB_MISSING");
        }

        await dbRun(
          env.DB,
          "UPDATE attachments SET last_accessed_at = ?1 WHERE id = ?2",
          new Date().toISOString(),
          attachmentId
        );

        return respond(
          new Response(await object.arrayBuffer(), {
            headers: {
              "content-type": attachment.mime_type,
              etag: object.httpEtag ?? "",
            },
          })
        );
      }

      if (request.method === "POST" && pathname === "/v1/reports") {
        const auth = await requireAuth(request, env);
        const body = reportSchema.parse(await readJson(request));
        const reportId = crypto.randomUUID();
        await dbRun(
          env.DB,
          `INSERT INTO reports (
             id,
             reporter_account_id,
             target_conversation_id,
             target_account_id,
             target_attachment_id,
             reason,
             disclosed_payload_json,
             evidence_message_ids_json,
             created_at
           )
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
          reportId,
          auth.accountId,
          body.targetConversationId ?? null,
          body.targetAccountId ?? null,
          body.targetAttachmentId ?? null,
          body.reason,
          JSON.stringify(body.disclosedPayload),
          JSON.stringify(body.evidenceMessageIds ?? []),
          new Date().toISOString()
        );

        return respond(json({ reportId, status: "open" }, { status: 201 }));
      }

      return respond(json({ error: "Not found" }, { status: 404 }));
    } catch (error) {
      return withCors(errorResponse(error), request, env.EMBERCHAMBER_ALLOWED_ORIGINS);
    }
  },
};

export { DeviceMailboxDO, GroupCoordinatorDO, RateLimitDO };
