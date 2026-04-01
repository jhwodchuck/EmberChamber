import type {
  AttachmentTicket,
  CipherEnvelope,
  ConversationDescriptor,
  ContactCard,
  MagicLinkChallenge,
} from "@emberchamber/protocol";
import { z } from "zod";
import { DeviceMailboxDO } from "./do/device-mailbox";
import { GroupCoordinatorDO } from "./do/group-coordinator";
import { RateLimitDO } from "./do/rate-limit";
import { blindIndex, encryptString, normalizeEmail, sha256Hex, signValue } from "./lib/crypto";
import { dbAll, dbFirst, dbRun } from "./lib/d1";
import { errorResponse, HttpError, json, readJson } from "./lib/http";
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
  EMBERCHAMBER_EMAIL_PROVIDER: string;
  EMBERCHAMBER_EMAIL_FROM: string;
  EMBERCHAMBER_DEV_INVITE_TOKEN?: string;
  EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET: string;
  EMBERCHAMBER_EMAIL_INDEX_SECRET: string;
  EMBERCHAMBER_ACCESS_TOKEN_SECRET: string;
  EMBERCHAMBER_REFRESH_TOKEN_SECRET: string;
  EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET: string;
}

interface AuthContext {
  accountId: string;
  deviceId: string;
  sessionId: string;
}

const authStartSchema = z.object({
  email: z.string().email(),
  inviteToken: z.string().min(3).max(128).optional(),
  deviceLabel: z.string().min(1).max(64).default("New device"),
});

const authCompleteSchema = z.object({
  completionToken: z.string().min(12),
  deviceLabel: z.string().min(1).max(64).default("Primary device"),
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
});

const reportSchema = z.object({
  targetConversationId: z.string().uuid().optional(),
  targetAccountId: z.string().uuid().optional(),
  reason: z.string().min(3).max(500),
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

async function createSession(env: Env, accountId: string, deviceId: string) {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      if (request.method === "GET" && pathname === "/health") {
        return json({
          status: "ok",
          relay: "cloudflare-workers",
          timestamp: new Date().toISOString(),
        });
      }

      if (request.method === "POST" && pathname === "/v1/auth/start") {
        const body = authStartSchema.parse(await readJson(request));
        const email = normalizeEmail(body.email);
        const emailBlindIndex = await blindIndex(env.EMBERCHAMBER_EMAIL_INDEX_SECRET, email);
        const ip = request.headers.get("cf-connecting-ip") ?? "local";

        await enforceRateLimit(env, `auth:start:${ip}`, 10, 15 * 60 * 1000);
        await enforceRateLimit(env, `auth:start:email:${emailBlindIndex}`, 5, 15 * 60 * 1000);

        const accountExists = await isExistingAccount(env, emailBlindIndex);
        const inviteHash = accountExists ? null : await requireBetaInvite(env, body.inviteToken);

        const challengeId = crypto.randomUUID();
        const completionToken = `${challengeId}.${crypto.randomUUID()}`;
        const completionTokenHash = await sha256Hex(`completion:${completionToken}`);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const emailCiphertext = await encryptString(env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET, email);

        await dbRun(
          env.DB,
          `INSERT INTO auth_challenges (
            id, email_ciphertext, email_blind_index, invite_token_hash, completion_token_hash, expires_at, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
          challengeId,
          emailCiphertext,
          emailBlindIndex,
          inviteHash,
          completionTokenHash,
          expiresAt,
          new Date().toISOString()
        );

        await env.EMAIL_QUEUE.send({
          type: "magic_link",
          to: email,
          from: env.EMBERCHAMBER_EMAIL_FROM,
          completionUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/auth/complete?token=${encodeURIComponent(completionToken)}`,
          expiresAt,
        });

        const response: MagicLinkChallenge = {
          id: challengeId,
          expiresAt,
          inviteRequired: !accountExists,
          ...(env.EMBERCHAMBER_EMAIL_PROVIDER === "log" ? { debugCompletionToken: completionToken } : {}),
        };

        return json(response, { status: 202 });
      }

      if (request.method === "POST" && pathname === "/v1/auth/complete") {
        const body = authCompleteSchema.parse(await readJson(request));
        const completionTokenHash = await sha256Hex(`completion:${body.completionToken}`);
        const challenge = await dbFirst<{
          id: string;
          email_ciphertext: string;
          email_blind_index: string;
          invite_token_hash: string | null;
          expires_at: string;
          consumed_at: string | null;
        }>(
          env.DB,
          `SELECT id, email_ciphertext, email_blind_index, invite_token_hash, expires_at, consumed_at
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

        const deviceId = crypto.randomUUID();
        await dbRun(
          env.DB,
          "INSERT INTO devices (id, account_id, device_label, created_at) VALUES (?1, ?2, ?3, ?4)",
          deviceId,
          account.account_id,
          body.deviceLabel,
          new Date().toISOString()
        );
        await dbRun(
          env.DB,
          "UPDATE auth_challenges SET consumed_at = ?1 WHERE id = ?2",
          new Date().toISOString(),
          challenge.id
        );

        return json(await createSession(env, account.account_id, deviceId));
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

        return json({
          accessToken,
          sessionId: session.id,
          deviceId: session.device_id,
        });
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
        return json(
          {
            supported: false,
            message: "Passkey enrollment is scaffolded in the protocol, but not yet wired in this beta relay.",
          },
          { status: 501 }
        );
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

        return json({ registered: true, deviceId: auth.deviceId });
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

        return json({
          linkId,
          qrPayload: linkToken,
          expiresAt,
        });
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

        return json({ confirmed: true, linkId: body.linkId });
      }

      if (request.method === "POST" && pathname === "/v1/contacts/card/resolve") {
        await requireAuth(request, env);
        const body = contactCardSchema.parse(await readJson(request));
        const decoded = JSON.parse(atob(body.cardToken)) as ContactCard;
        const account = await dbFirst<{ id: string }>(env.DB, "SELECT id FROM accounts WHERE id = ?1", decoded.accountId);

        if (!account) {
          throw new HttpError(404, "Contact card not found", "CONTACT_NOT_FOUND");
        }

        return json(decoded);
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

        return json({
          ...card,
          cardToken: btoa(JSON.stringify(card)),
        });
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
          return json(descriptor);
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

        return json({
          id: conversationId,
          kind: "direct_message",
          epoch: 1,
          memberAccountIds: [auth.accountId, body.peerAccountId],
          createdAt,
        } satisfies ConversationDescriptor);
      }

      if (request.method === "POST" && pathname === "/v1/groups") {
        const auth = await requireAuth(request, env);
        const body = groupSchema.parse(await readJson(request));
        const conversationId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const memberAccountIds = Array.from(new Set([auth.accountId, ...body.memberAccountIds]));

        await dbRun(
          env.DB,
          "INSERT INTO conversations (id, kind, title, epoch, created_by, created_at) VALUES (?1, 'group', ?2, 1, ?3, ?4)",
          conversationId,
          body.title,
          auth.accountId,
          createdAt
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

        return json({
          id: conversationId,
          kind: "group",
          title: body.title,
          epoch: 1,
          memberAccountIds,
          createdAt,
        } satisfies ConversationDescriptor);
      }

      const groupInviteMatch = pathname.match(/^\/v1\/groups\/([0-9a-f-]{36})\/invites$/i);
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

        if (!membership || !["owner", "admin"].includes(membership.role)) {
          throw new HttpError(403, "Only owners or admins can mint invites", "FORBIDDEN");
        }

        const inviteId = crypto.randomUUID();
        const inviteToken = crypto.randomUUID().replace(/-/g, "");
        const tokenHash = await hashInviteToken(inviteToken);
        const expiresAt = body.expiresInHours
          ? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000).toISOString()
          : null;

        await dbRun(
          env.DB,
          `INSERT INTO conversation_invites (id, conversation_id, token_hash, created_by, max_uses, expires_at, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
          inviteId,
          conversationId,
          tokenHash,
          auth.accountId,
          body.maxUses ?? null,
          expiresAt,
          new Date().toISOString()
        );

        return json({
          id: inviteId,
          inviteToken,
          expiresAt,
          maxUses: body.maxUses ?? null,
        });
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

        return json({ acceptedEnvelopeIds: accepted }, { status: 202 });
      }

      if (request.method === "GET" && pathname === "/v1/mailbox/sync") {
        const auth = await requireAuth(request, env);
        const id = env.DEVICE_MAILBOX.idFromName(auth.deviceId);
        const stub = env.DEVICE_MAILBOX.get(id);
        const after = url.searchParams.get("after");
        const limit = url.searchParams.get("limit") ?? "50";
        return stub.fetch(`https://do/sync?after=${encodeURIComponent(after ?? "")}&limit=${encodeURIComponent(limit)}`);
      }

      if (request.method === "POST" && pathname === "/v1/mailbox/ack") {
        const auth = await requireAuth(request, env);
        const body = mailboxAckSchema.parse(await readJson(request));
        const id = env.DEVICE_MAILBOX.idFromName(auth.deviceId);
        const stub = env.DEVICE_MAILBOX.get(id);
        return stub.fetch("https://do/ack", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }

      if (request.method === "POST" && pathname === "/v1/attachments/ticket") {
        const auth = await requireAuth(request, env);
        const body = attachmentTicketSchema.parse(await readJson(request));
        const attachmentId = crypto.randomUUID();
        const r2Key = `${auth.accountId}/${attachmentId}/${body.fileName}`;
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await dbRun(
          env.DB,
          `INSERT INTO attachments (id, account_id, r2_key, file_name, mime_type, byte_length, sha256_b64, created_at, last_accessed_at, expires_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8, ?9)`,
          attachmentId,
          auth.accountId,
          r2Key,
          body.fileName,
          body.mimeType,
          body.byteLength,
          body.sha256B64 ?? null,
          new Date().toISOString(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        );

        const uploadToken = await signAttachmentToken(env, attachmentId, "upload", expiresAt.getTime());
        const downloadToken = await signAttachmentToken(env, attachmentId, "download", expiresAt.getTime());

        const response: AttachmentTicket = {
          attachmentId,
          uploadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/upload/${attachmentId}?token=${encodeURIComponent(uploadToken)}`,
          downloadUrl: `${env.EMBERCHAMBER_RELAY_PUBLIC_URL}/v1/attachments/download/${attachmentId}?token=${encodeURIComponent(downloadToken)}`,
          expiresAt: expiresAt.toISOString(),
          maxBytes: body.byteLength,
        };
        return json(response, { status: 201 });
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

        return json({ uploaded: true });
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

        return new Response(await object.arrayBuffer(), {
          headers: {
            "content-type": attachment.mime_type,
            etag: object.httpEtag ?? "",
          },
        });
      }

      if (request.method === "POST" && pathname === "/v1/reports") {
        const auth = await requireAuth(request, env);
        const body = reportSchema.parse(await readJson(request));
        const reportId = crypto.randomUUID();
        await dbRun(
          env.DB,
          `INSERT INTO reports (id, reporter_account_id, target_conversation_id, target_account_id, reason, disclosed_payload_json, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
          reportId,
          auth.accountId,
          body.targetConversationId ?? null,
          body.targetAccountId ?? null,
          body.reason,
          JSON.stringify(body.disclosedPayload),
          new Date().toISOString()
        );

        return json({ reportId, status: "open" }, { status: 201 });
      }

      return json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      return errorResponse(error);
    }
  },
};

export { DeviceMailboxDO, GroupCoordinatorDO, RateLimitDO };
