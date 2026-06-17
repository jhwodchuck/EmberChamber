import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev } from "wrangler";
import {
  encodeDeviceLinkQrPayload,
  parseDeviceLinkQrPayload,
  type DeviceLinkConfirmResponse,
  type DeviceLinkStartResponse,
  type DeviceLinkStatus,
} from "@emberchamber/protocol";

const relayDir = path.resolve(__dirname, "..");

type RelaySession = {
  accountId: string;
  accessToken: string;
  deviceId: string;
  sessionId: string;
  refreshToken: string;
  expiresAt: string;
};

const relaySecrets = {
  EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET: "test-email-encryption-secret",
  EMBERCHAMBER_EMAIL_INDEX_SECRET: "test-email-index-secret",
  EMBERCHAMBER_ACCESS_TOKEN_SECRET: "test-access-token-secret",
  EMBERCHAMBER_REFRESH_TOKEN_SECRET: "test-refresh-token-secret",
  EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET: "test-attachment-token-secret",
  EMBERCHAMBER_PUSH_TOKEN_SECRET: "test-push-token-secret",
  EMBERCHAMBER_ADMIN_SECRET: "test-admin-secret",
};

const defaultClientHeaders = {
  "x-emberchamber-client-platform": "android",
  "x-emberchamber-client-version": "0.1.0",
  "x-emberchamber-client-build": "1",
  "x-emberchamber-device-model": "Google Pixel 8",
};

let worker: Awaited<ReturnType<typeof unstable_dev>>;
let persistPath: string;

async function relayFetch(pathname: string, init?: RequestInit) {
  return worker.fetch(`http://127.0.0.1${pathname}`, init as never);
}

async function relayJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await relayFetch(pathname, init);
  return (await response.json()) as T;
}

function executeLocalSql(sql: string) {
  execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "emberchamber-relay-dev",
      "--local",
      "--persist-to",
      persistPath,
      "--config",
      "wrangler.jsonc",
      "--command",
      sql,
    ],
    {
      cwd: relayDir,
      stdio: "pipe",
    },
  );
}

async function bootstrapAccount(email: string, deviceLabel: string) {
  const challenge = await relayJson<{
    debugCompletionToken?: string;
  }>("/v1/auth/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": testClientIp(email),
      ...defaultClientHeaders,
    },
    body: JSON.stringify({
      email,
      inviteToken: "dev-beta-invite",
      deviceLabel,
      ageConfirmed18: true,
    }),
  });

  expect(challenge.debugCompletionToken).toBeTruthy();

  return relayJson<RelaySession>("/v1/auth/complete", {
    method: "POST",
    headers: { "content-type": "application/json", ...defaultClientHeaders },
    body: JSON.stringify({
      completionToken: challenge.debugCompletionToken,
      deviceLabel,
    }),
  });
}

async function registerOpaqueBundle(session: RelaySession) {
  const response = await relayFetch("/v1/devices/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({
      identityKeyB64: `${session.deviceId}-identity-key-material`,
      signedPrekeyB64: `${session.deviceId}-signed-prekey-material`,
      signedPrekeySignatureB64: `${session.deviceId}-signed-prekey-signature`,
      oneTimePrekeysB64: [
        `${session.deviceId}-otp-1`,
        `${session.deviceId}-otp-2`,
      ],
    }),
  });

  expect(response.status).toBe(200);
}

async function registerPushToken(
  session: RelaySession,
  token = `fcm-${session.deviceId}-registration-token`,
) {
  const response = await relayFetch("/v1/devices/push-token", {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({
      provider: "fcm",
      platform: "android",
      token,
      appId: "com.emberchamber.mobile",
      pushEnvironment: "production",
    }),
  });

  expect(response.status).toBe(200);
  return (await response.json()) as {
    registered: boolean;
    deviceId: string;
    provider: string;
    platform: string;
  };
}

async function updateDisplayName(session: RelaySession, displayName: string) {
  const response = await relayFetch("/v1/me", {
    method: "PATCH",
    headers: authHeaders(session),
    body: JSON.stringify({ displayName }),
  });

  expect(response.status).toBe(200);
}

function authHeaders(session: RelaySession) {
  return {
    authorization: `Bearer ${session.accessToken}`,
    "content-type": "application/json",
    ...defaultClientHeaders,
  };
}

function sha256B64(value: string) {
  return createHash("sha256").update(value).digest("base64");
}

function testClientIp(seed: string) {
  const digest = createHash("sha256").update(seed).digest();
  return `198.51.${digest[0]}.${digest[1]}`;
}

function relayWebSocketUrl(pathname: string) {
  return `ws://${worker.address}:${worker.port}${pathname}`;
}

async function openWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // Ignore close failures while timing out.
      }
      reject(new Error(`Timed out opening websocket ${url}`));
    }, 5_000);

    socket.onopen = () => {
      clearTimeout(timeout);
      resolve(socket);
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Websocket handshake failed for ${url}`));
    };
  });
}

async function expectWebSocketRejected(url: string) {
  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(url);
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // Ignore close failures while timing out.
      }
      finish(() =>
        reject(new Error(`Timed out waiting for websocket rejection ${url}`)),
      );
    }, 5_000);

    socket.onopen = () => {
      socket.close();
      finish(() =>
        reject(new Error(`Websocket unexpectedly opened for ${url}`)),
      );
    };
    socket.onerror = () => {
      finish(resolve);
    };
    socket.onclose = () => {
      finish(resolve);
    };
  });
}

async function createRelayHostedGroup(session: RelaySession, title: string) {
  const group = await relayJson<{ id: string; historyMode: string }>(
    "/v1/groups",
    {
      method: "POST",
      headers: authHeaders(session),
      body: JSON.stringify({
        title,
        memberAccountIds: [],
        memberCap: 6,
        sensitiveMediaDefault: false,
      }),
    },
  );
  executeLocalSql(
    `UPDATE conversations SET history_mode = 'relay_hosted' WHERE id = '${group.id}'`,
  );
  return group.id;
}

beforeAll(async () => {
  persistPath = mkdtempSync(path.join(tmpdir(), "relay-test-"));
  execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "migrations",
      "apply",
      "emberchamber-relay-dev",
      "--local",
      "--persist-to",
      persistPath,
      "--config",
      "wrangler.jsonc",
    ],
    {
      cwd: relayDir,
      stdio: "pipe",
    },
  );

  worker = await unstable_dev("src/index.ts", {
    config: "wrangler.jsonc",
    local: true,
    persistTo: persistPath,
    logLevel: "error",
    vars: relaySecrets,
    experimental: {
      disableExperimentalWarning: true,
      testMode: true,
    },
  });
}, 60_000);

afterAll(async () => {
  await worker.stop();
  rmSync(persistPath, { recursive: true, force: true });
});

describe("relay routes", () => {
  it("serves health and readiness probes", async () => {
    const health = await relayFetch("/health");
    const ready = await relayFetch("/ready");

    expect(health.status).toBe(200);
    expect(ready.status).toBe(200);

    const readyBody = (await ready.json()) as {
      status: string;
      checks: Record<string, boolean>;
    };
    expect(readyBody.status).toBe("ok");
    expect(readyBody.checks.db).toBe(true);
    expect(readyBody.checks.cleanupQueue).toBe(true);
  });

  it("lists active sessions with client metadata", async () => {
    const alice = await bootstrapAccount(
      "session-meta@example.com",
      "Alice Pixel",
    );

    const sessions = await relayJson<
      Array<{
        id: string;
        deviceLabel: string;
        isCurrent: boolean;
        clientPlatform?: string | null;
        clientVersion?: string | null;
        clientBuild?: string | null;
        deviceModel?: string | null;
      }>
    >("/v1/sessions", {
      headers: authHeaders(alice),
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: alice.sessionId,
      deviceLabel: "Alice Pixel",
      isCurrent: true,
      clientPlatform: "android",
      clientVersion: "0.1.0",
      clientBuild: "1",
      deviceModel: "Google Pixel 8",
    });
  });

  it("allows all-devices-lost recovery with existing account email and no invite token", async () => {
    const email = "all-devices-lost@example.com";
    const alice = await bootstrapAccount(email, "Alice Phone");
    executeLocalSql(
      `UPDATE sessions SET revoked_at = '${new Date().toISOString()}' WHERE account_id = '${alice.accountId}'`,
    );

    const challenge = await relayJson<{
      debugCompletionToken?: string;
      inviteRequired: boolean;
    }>("/v1/auth/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": testClientIp(`${email}-recovery`),
        ...defaultClientHeaders,
      },
      body: JSON.stringify({
        email,
        deviceLabel: "Recovered browser",
        ageConfirmed18: true,
      }),
    });

    expect(challenge.inviteRequired).toBe(false);
    expect(challenge.debugCompletionToken).toBeTruthy();

    const recovered = await relayJson<RelaySession>("/v1/auth/complete", {
      method: "POST",
      headers: { "content-type": "application/json", ...defaultClientHeaders },
      body: JSON.stringify({
        completionToken: challenge.debugCompletionToken,
        deviceLabel: "Recovered browser",
      }),
    });

    expect(recovered.accountId).toBe(alice.accountId);
    expect(recovered.sessionId).not.toBe(alice.sessionId);
    expect(recovered.deviceId).not.toBe(alice.deviceId);

    const sessions = await relayJson<Array<{ id: string; isCurrent: boolean }>>(
      "/v1/sessions",
      {
        headers: authHeaders(recovered),
      },
    );
    expect(sessions).toEqual([
      expect.objectContaining({ id: recovered.sessionId, isCurrent: true }),
    ]);
  });

  it("extends the relay session deadline when refreshing access tokens", async () => {
    const alice = await bootstrapAccount(
      "session-refresh@example.com",
      "Alice Desktop",
    );
    const expiringAt = new Date(Date.now() + 60 * 1000).toISOString();
    executeLocalSql(
      `UPDATE sessions SET expires_at = '${expiringAt}' WHERE id = '${alice.sessionId}'`,
    );

    const refresh = await relayJson<{
      accessToken: string;
      sessionId: string;
      deviceId: string;
      expiresAt: string;
    }>("/v1/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", ...defaultClientHeaders },
      body: JSON.stringify({ refreshToken: alice.refreshToken }),
    });

    expect(refresh.sessionId).toBe(alice.sessionId);
    expect(refresh.deviceId).toBe(alice.deviceId);
    expect(new Date(refresh.expiresAt).getTime()).toBeGreaterThan(
      new Date(expiringAt).getTime() + 29 * 24 * 60 * 60 * 1000,
    );

    const sessions = await relayJson<Array<{ id: string }>>("/v1/sessions", {
      headers: { authorization: `Bearer ${refresh.accessToken}` },
    });
    expect(sessions.some((session) => session.id === alice.sessionId)).toBe(
      true,
    );
  });

  it("recovers recently seen expired sessions when the refresh token still matches", async () => {
    const alice = await bootstrapAccount(
      "session-refresh-recovery@example.com",
      "Alice Phone",
    );
    const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();
    const recentLastSeenAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    executeLocalSql(
      `UPDATE sessions SET expires_at = '${expiredAt}', last_seen_at = '${recentLastSeenAt}' WHERE id = '${alice.sessionId}'`,
    );

    const refresh = await relayJson<{
      accessToken: string;
      sessionId: string;
      deviceId: string;
      expiresAt: string;
    }>("/v1/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", ...defaultClientHeaders },
      body: JSON.stringify({ refreshToken: alice.refreshToken }),
    });

    expect(refresh.sessionId).toBe(alice.sessionId);
    expect(refresh.deviceId).toBe(alice.deviceId);
    expect(new Date(refresh.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const sessions = await relayJson<Array<{ id: string }>>("/v1/sessions", {
      headers: { authorization: `Bearer ${refresh.accessToken}` },
    });
    expect(sessions.some((session) => session.id === alice.sessionId)).toBe(
      true,
    );
  });

  it("lets operators revoke all account sessions and push tokens", async () => {
    const alice = await bootstrapAccount(
      "operator-revoke@example.com",
      "Alice Phone",
    );
    await registerPushToken(alice);

    const forbidden = await relayFetch("/v1/admin/revoke-account-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: alice.accountId }),
    });
    expect(forbidden.status).toBe(403);

    const revoke = await relayFetch("/v1/admin/revoke-account-sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${relaySecrets.EMBERCHAMBER_ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        accountId: alice.accountId,
        reason: "lost trusted device",
      }),
    });
    expect(revoke.status).toBe(200);
    const revokeBody = (await revoke.json()) as {
      revoked: boolean;
      sessionsRevoked: number;
      pushTokensInvalidated: number;
    };
    expect(revokeBody.revoked).toBe(true);
    expect(revokeBody.sessionsRevoked).toBe(1);
    expect(revokeBody.pushTokensInvalidated).toBe(1);

    const refresh = await relayFetch("/v1/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", ...defaultClientHeaders },
      body: JSON.stringify({ refreshToken: alice.refreshToken }),
    });
    expect(refresh.status).toBe(401);

    const me = await relayFetch("/v1/me", {
      headers: authHeaders(alice),
    });
    expect(me.status).toBe(401);
  });

  it("lists conversations and joined-space metadata search results", async () => {
    const alice = await bootstrapAccount("alice@example.com", "Alice browser");
    const bob = await bootstrapAccount("bob@example.com", "Bob browser");
    await updateDisplayName(alice, "Alice");
    await updateDisplayName(bob, "Bob");

    const dm = await relayJson<{ id: string; historyMode: string }>(
      "/v1/dm/open",
      {
        method: "POST",
        headers: authHeaders(alice),
        body: JSON.stringify({ peerAccountId: bob.accountId }),
      },
    );

    const group = await relayJson<{
      id: string;
      title?: string;
      historyMode: string;
    }>("/v1/groups", {
      method: "POST",
      headers: authHeaders(alice),
      body: JSON.stringify({
        title: "Trusted Hosts",
        memberAccountIds: [],
        memberCap: 6,
        sensitiveMediaDefault: false,
      }),
    });

    const conversations = await relayJson<
      Array<{ id: string; historyMode: string; kind: string; title?: string }>
    >("/v1/conversations", {
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });

    expect(conversations.find((entry) => entry.id === dm.id)?.historyMode).toBe(
      "device_encrypted",
    );
    expect(
      conversations.find((entry) => entry.id === group.id)?.historyMode,
    ).toBe("device_encrypted");

    const search = await relayJson<{
      conversations: Array<{ id: string }>;
      accounts: Array<{ displayName: string }>;
    }>("/v1/search?q=trusted", {
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });
    const accountSearch = await relayJson<{
      accounts: Array<{ displayName: string }>;
    }>("/v1/search?q=member-", {
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });

    expect(search.conversations.some((entry) => entry.id === group.id)).toBe(
      true,
    );
    expect(accountSearch.accounts.length).toBeGreaterThan(0);
  });

  it("issues encrypted attachment tickets and refreshes attachment access for conversation members", async () => {
    const owner = await bootstrapAccount("owner@example.com", "Owner browser");
    const peer = await bootstrapAccount("peer@example.com", "Peer browser");
    await updateDisplayName(peer, "Peer");
    const dm = await relayJson<{ id: string; epoch: number }>("/v1/dm/open", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ peerAccountId: peer.accountId }),
    });

    const ciphertext = "ciphertext-payload";
    const ticket = await relayJson<{
      attachmentId: string;
      uploadUrl: string;
      encryptionMode: string;
    }>("/v1/attachments/ticket", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({
        fileName: "vault.bin",
        mimeType: "application/octet-stream",
        encryptionMode: "device_encrypted",
        ciphertextByteLength: ciphertext.length,
        ciphertextSha256B64: sha256B64(ciphertext),
        plaintextByteLength: 4,
        plaintextSha256B64: sha256B64("plain"),
        conversationId: dm.id,
        conversationEpoch: dm.epoch,
        contentClass: "file",
        retentionMode: "private_vault",
        protectionProfile: "standard",
      }),
    });

    expect(ticket.encryptionMode).toBe("device_encrypted");

    const upload = await relayFetch(
      new URL(ticket.uploadUrl).pathname + new URL(ticket.uploadUrl).search,
      {
        method: "PUT",
        body: ciphertext,
      },
    );
    expect(upload.status).toBe(200);

    const access = await relayJson<{
      attachmentId: string;
      downloadUrl: string;
    }>(`/v1/attachments/${ticket.attachmentId}/access`, {
      headers: { authorization: `Bearer ${peer.accessToken}` },
    });

    expect(access.attachmentId).toBe(ticket.attachmentId);
    expect(access.downloadUrl).toContain(
      `/v1/attachments/download/${ticket.attachmentId}`,
    );
  });

  it("routes encrypted group attachment delivery through mailbox fanout", async () => {
    const owner = await bootstrapAccount(
      "group-owner@example.com",
      "Group owner",
    );
    const peer = await bootstrapAccount("group-peer@example.com", "Group peer");
    await updateDisplayName(peer, "Group peer");
    await registerOpaqueBundle(owner);
    await registerOpaqueBundle(peer);

    const group = await relayJson<{
      id: string;
      epoch: number;
      historyMode: string;
    }>("/v1/groups", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({
        title: "Encrypted group",
        memberAccountIds: [peer.accountId],
        memberCap: 6,
        sensitiveMediaDefault: false,
      }),
    });
    expect(group.historyMode).toBe("device_encrypted");

    const ciphertext = "cipher-group-payload";
    const ticket = await relayJson<{
      attachmentId: string;
      uploadUrl: string;
      encryptionMode: string;
    }>("/v1/attachments/ticket", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({
        fileName: "group.bin",
        mimeType: "application/octet-stream",
        encryptionMode: "device_encrypted",
        ciphertextByteLength: ciphertext.length,
        ciphertextSha256B64: sha256B64(ciphertext),
        plaintextByteLength: 11,
        plaintextSha256B64: sha256B64("plain-group"),
        conversationId: group.id,
        conversationEpoch: group.epoch,
        contentClass: "file",
        retentionMode: "private_vault",
        protectionProfile: "standard",
      }),
    });

    expect(ticket.encryptionMode).toBe("device_encrypted");

    const upload = await relayFetch(
      new URL(ticket.uploadUrl).pathname + new URL(ticket.uploadUrl).search,
      {
        method: "PUT",
        body: ciphertext,
      },
    );
    expect(upload.status).toBe(200);

    const unsupportedHistoryResponse = await relayFetch(
      `/v1/groups/${group.id}/messages?limit=20`,
      {
        headers: { authorization: `Bearer ${peer.accessToken}` },
      },
    );
    expect(unsupportedHistoryResponse.status).toBe(409);

    const peerBundles = await relayJson<Array<{ deviceId: string }>>(
      `/v1/accounts/${peer.accountId}/device-bundles`,
      {
        headers: { authorization: `Bearer ${owner.accessToken}` },
      },
    );

    const sendResult = await relayJson<{ acceptedEnvelopeIds: string[] }>(
      "/v1/messages/batch",
      {
        method: "POST",
        headers: authHeaders(owner),
        body: JSON.stringify({
          conversationId: group.id,
          epoch: group.epoch,
          envelopes: [
            {
              recipientDeviceId: peerBundles[0].deviceId,
              ciphertext: Buffer.from(
                JSON.stringify({ kind: "ember_conversation_v1" }),
              ).toString("base64"),
              clientMessageId: "group-attachment-message-1",
              attachmentIds: [ticket.attachmentId],
            },
          ],
        }),
      },
    );
    expect(sendResult.acceptedEnvelopeIds).toHaveLength(1);

    const mailboxSync = await relayJson<{
      envelopes: Array<{ attachmentIds: string[] }>;
    }>("/v1/mailbox/sync", {
      headers: { authorization: `Bearer ${peer.accessToken}` },
    });
    expect(mailboxSync.envelopes).toHaveLength(1);
    expect(mailboxSync.envelopes[0]?.attachmentIds).toEqual([
      ticket.attachmentId,
    ]);

    const access = await relayJson<{
      attachmentId: string;
      downloadUrl: string;
    }>(`/v1/attachments/${ticket.attachmentId}/access`, {
      headers: { authorization: `Bearer ${peer.accessToken}` },
    });
    expect(access.attachmentId).toBe(ticket.attachmentId);
    expect(access.downloadUrl).toContain(
      `/v1/attachments/download/${ticket.attachmentId}`,
    );
  });

  it("deduplicates mailbox sends by clientMessageId and returns a single envelope", async () => {
    const alice = await bootstrapAccount(
      "mailbox-alice@example.com",
      "Mailbox Alice",
    );
    const bob = await bootstrapAccount(
      "mailbox-bob@example.com",
      "Mailbox Bob",
    );

    await registerOpaqueBundle(alice);
    await registerOpaqueBundle(bob);

    const dm = await relayJson<{ id: string; epoch: number }>("/v1/dm/open", {
      method: "POST",
      headers: authHeaders(alice),
      body: JSON.stringify({ peerAccountId: bob.accountId }),
    });
    const bobBundles = await relayJson<Array<{ deviceId: string }>>(
      `/v1/accounts/${bob.accountId}/device-bundles`,
      {
        headers: { authorization: `Bearer ${alice.accessToken}` },
      },
    );

    const payload = {
      conversationId: dm.id,
      epoch: dm.epoch,
      envelopes: [
        {
          recipientDeviceId: bobBundles[0].deviceId,
          ciphertext: btoa(JSON.stringify({ kind: "test", text: "hello" })),
          clientMessageId: "client-message-1",
          attachmentIds: [],
        },
      ],
    };

    const firstSend = await relayJson<{
      acceptedEnvelopeIds: string[];
      duplicateEnvelopeIds?: string[];
    }>("/v1/messages/batch", {
      method: "POST",
      headers: authHeaders(alice),
      body: JSON.stringify(payload),
    });
    const secondSend = await relayJson<{
      acceptedEnvelopeIds: string[];
      duplicateEnvelopeIds?: string[];
    }>("/v1/messages/batch", {
      method: "POST",
      headers: authHeaders(alice),
      body: JSON.stringify(payload),
    });

    expect(firstSend.acceptedEnvelopeIds).toHaveLength(1);
    expect(secondSend.duplicateEnvelopeIds).toEqual(
      firstSend.acceptedEnvelopeIds,
    );

    const sync = await relayJson<{
      envelopes: Array<{ envelopeId: string }>;
    }>("/v1/mailbox/sync", {
      headers: { authorization: `Bearer ${bob.accessToken}` },
    });

    expect(sync.envelopes).toHaveLength(1);
    expect(sync.envelopes[0].envelopeId).toBe(firstSend.acceptedEnvelopeIds[0]);
  });

  it("completes device-link handoff from both QR directions", async () => {
    const owner = await bootstrapAccount(
      "device-link-owner@example.com",
      "Owner desktop",
    );

    const start = await relayJson<DeviceLinkStartResponse>(
      "/v1/devices/link/start",
      {
        method: "POST",
        headers: authHeaders(owner),
        body: JSON.stringify({ deviceLabel: "Owner desktop" }),
      },
    );

    expect(start.state).toBe("pending_claim");
    const sourceQr = parseDeviceLinkQrPayload(start.qrPayload);
    expect(sourceQr.qrMode).toBe("source_display");

    const claimed = await relayJson<DeviceLinkStatus>(
      "/v1/devices/link/claim",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          qrPayload: start.qrPayload,
          deviceLabel: "Android phone",
        }),
      },
    );
    expect(claimed.state).toBe("pending_approval");
    expect(claimed.requesterLabel).toBe("Android phone");

    const confirmed = await relayJson<DeviceLinkConfirmResponse>(
      "/v1/devices/link/confirm",
      {
        method: "POST",
        headers: authHeaders(owner),
        body: JSON.stringify({ linkId: start.linkId }),
      },
    );
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.state).toBe("approved");

    const completed = await relayJson<RelaySession>(
      "/v1/devices/link/complete",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          linkToken: sourceQr.linkToken,
          qrMode: sourceQr.qrMode,
        }),
      },
    );
    expect(completed.accountId).toBe(owner.accountId);
    expect(completed.deviceId).not.toBe(owner.deviceId);

    const consumedStatus = await relayJson<DeviceLinkStatus>(
      `/v1/devices/link/status?token=${encodeURIComponent(sourceQr.linkToken)}&qrMode=${encodeURIComponent(sourceQr.qrMode)}`,
    );
    expect(consumedStatus.state).toBe("consumed");
    expect(consumedStatus.completedSessionId).toBe(completed.sessionId);

    const targetLinkToken = `${randomUUID()}-${randomUUID()}`;
    const targetQrPayload = encodeDeviceLinkQrPayload({
      relayOrigin: "http://127.0.0.1:8787",
      qrMode: "target_display",
      linkToken: targetLinkToken,
      requesterLabel: "Tablet browser",
    });

    const missingStatus = await relayFetch(
      `/v1/devices/link/status?token=${encodeURIComponent(targetLinkToken)}&qrMode=target_display`,
    );
    expect(missingStatus.status).toBe(404);
    expect(await missingStatus.json()).toMatchObject({
      code: "DEVICE_LINK_NOT_FOUND",
    });

    const scanned = await relayJson<DeviceLinkStatus>("/v1/devices/link/scan", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ qrPayload: targetQrPayload }),
    });
    expect(scanned.state).toBe("pending_approval");
    expect(scanned.requesterLabel).toBe("Tablet browser");
    expect(scanned.qrMode).toBe("target_display");

    const targetConfirmed = await relayJson<DeviceLinkConfirmResponse>(
      "/v1/devices/link/confirm",
      {
        method: "POST",
        headers: authHeaders(owner),
        body: JSON.stringify({ linkId: scanned.linkId }),
      },
    );
    expect(targetConfirmed.state).toBe("approved");

    const targetCompleted = await relayJson<RelaySession>(
      "/v1/devices/link/complete",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          linkToken: targetLinkToken,
          qrMode: "target_display",
        }),
      },
    );
    expect(targetCompleted.accountId).toBe(owner.accountId);
    expect(targetCompleted.deviceId).not.toBe(owner.deviceId);
  });

  it("registers and clears a native push token for the current device", async () => {
    const alice = await bootstrapAccount(
      "push-alice@example.com",
      "Push Alice",
    );

    const registered = await registerPushToken(alice);
    expect(registered.registered).toBe(true);
    expect(registered.deviceId).toBe(alice.deviceId);
    expect(registered.provider).toBe("fcm");
    expect(registered.platform).toBe("android");

    const clearedResponse = await relayFetch("/v1/devices/push-token", {
      method: "DELETE",
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });

    expect(clearedResponse.status).toBe(200);
    expect(await clearedResponse.json()).toEqual({
      cleared: true,
      deviceId: alice.deviceId,
    });
  });

  it("rejects websocket upgrades for revoked sessions", async () => {
    const alice = await bootstrapAccount(
      "revoked-ws@example.com",
      "Revoked websocket device",
    );
    const groupId = await createRelayHostedGroup(alice, "Revoked WS group");

    const mailboxSocket = await openWebSocket(
      relayWebSocketUrl(
        `/v1/mailbox/ws?token=${encodeURIComponent(alice.accessToken)}`,
      ),
    );
    mailboxSocket.close();

    const conversationSocket = await openWebSocket(
      relayWebSocketUrl(
        `/v1/conversations/${groupId}/ws?token=${encodeURIComponent(alice.accessToken)}`,
      ),
    );
    conversationSocket.close();

    const revokeResponse = await relayFetch(`/v1/sessions/${alice.sessionId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });
    expect(revokeResponse.status).toBe(200);

    await expectWebSocketRejected(
      relayWebSocketUrl(
        `/v1/mailbox/ws?token=${encodeURIComponent(alice.accessToken)}`,
      ),
    );

    await expectWebSocketRejected(
      relayWebSocketUrl(
        `/v1/conversations/${groupId}/ws?token=${encodeURIComponent(alice.accessToken)}`,
      ),
    );
  });

  it("updates group settings with dynamic PATCH combinations", async () => {
    const owner = await bootstrapAccount(
      "group-patch-owner@example.com",
      "Group patch owner",
    );
    const group = await relayJson<{ id: string }>("/v1/groups", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({
        title: "Patchable group",
        memberAccountIds: [],
        memberCap: 6,
        sensitiveMediaDefault: false,
      }),
    });

    const titleOnly = await relayFetch(`/v1/groups/${group.id}`, {
      method: "PATCH",
      headers: authHeaders(owner),
      body: JSON.stringify({ title: "Patch title only" }),
    });
    expect(titleOnly.status).toBe(200);

    const sensitiveOnly = await relayFetch(`/v1/groups/${group.id}`, {
      method: "PATCH",
      headers: authHeaders(owner),
      body: JSON.stringify({ sensitiveMediaDefault: true }),
    });
    expect(sensitiveOnly.status).toBe(200);

    const bothFields = await relayFetch(`/v1/groups/${group.id}`, {
      method: "PATCH",
      headers: authHeaders(owner),
      body: JSON.stringify({
        title: "Patch both fields",
        sensitiveMediaDefault: false,
      }),
    });
    expect(bothFields.status).toBe(200);

    const groups = await relayJson<
      Array<{ id: string; title?: string; sensitiveMediaDefault?: boolean }>
    >("/v1/groups", {
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });

    expect(groups.find((entry) => entry.id === group.id)).toMatchObject({
      title: "Patch both fields",
      sensitiveMediaDefault: false,
    });
  });

  it("creates a community with a default room and enforces the member cap", async () => {
    const organizer = await bootstrapAccount(
      "community-create-organizer@example.com",
      "Community organizer phone",
    );

    const community = await relayJson<{
      id: string;
      kind: string;
      roomCount: number;
      memberCap: number;
      title: string;
    }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Test Community",
        memberAccountIds: [],
        memberCap: 150,
        sensitiveMediaDefault: false,
        defaultRoomTitle: "General",
      }),
    });

    expect(community.kind).toBe("community");
    expect(community.roomCount).toBe(1);
    expect(community.memberCap).toBe(150);
    expect(community.title).toBe("Test Community");

    const conversations = await relayJson<
      Array<{ id: string; kind: string; roomCount: number }>
    >("/v1/conversations", {
      headers: { authorization: `Bearer ${organizer.accessToken}` },
    });
    const entry = conversations.find((c) => c.id === community.id);
    expect(entry?.kind).toBe("community");
    expect(entry?.roomCount).toBeGreaterThanOrEqual(1);

    const overflow = await relayFetch("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Overflow community",
        memberAccountIds: Array.from({ length: 150 }, () => randomUUID()),
        memberCap: 150,
        sensitiveMediaDefault: false,
      }),
    });
    expect(overflow.status).toBe(400);
    expect(await overflow.json()).toMatchObject({ code: "GROUP_CAP_EXCEEDED" });
  });

  it("updates community policies (allowMemberInvites and inviteFreezeEnabled)", async () => {
    const organizer = await bootstrapAccount(
      "community-policy-organizer@example.com",
      "Policy phone",
    );

    const community = await relayJson<{ id: string }>(
      "/v1/communities",
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({
          title: "Policy Community",
          memberAccountIds: [],
          memberCap: 50,
          sensitiveMediaDefault: false,
        }),
      },
    );

    const withMemberInvites = await relayJson<{
      allowMemberInvites: boolean;
      inviteFreezeEnabled: boolean;
    }>(`/v1/communities/${community.id}/policies`, {
      method: "PATCH",
      headers: authHeaders(organizer),
      body: JSON.stringify({ allowMemberInvites: true }),
    });
    expect(withMemberInvites.allowMemberInvites).toBe(true);

    const frozen = await relayJson<{
      allowMemberInvites: boolean;
      inviteFreezeEnabled: boolean;
    }>(`/v1/communities/${community.id}/policies`, {
      method: "PATCH",
      headers: authHeaders(organizer),
      body: JSON.stringify({ inviteFreezeEnabled: true }),
    });
    expect(frozen.inviteFreezeEnabled).toBe(true);
    expect(frozen.allowMemberInvites).toBe(true);
  });

  it("gates member-created invites behind allowMemberInvites community policy", async () => {
    const organizer = await bootstrapAccount(
      "invite-gate-organizer@example.com",
      "Gate organizer",
    );
    const member = await bootstrapAccount(
      "invite-gate-member@example.com",
      "Gate member",
    );

    const community = await relayJson<{ id: string }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Gated Community",
        memberAccountIds: [member.accountId],
        memberCap: 50,
        sensitiveMediaDefault: false,
        allowMemberInvites: false,
      }),
    });

    const blockedInvite = await relayFetch(
      `/v1/conversations/${community.id}/invites`,
      {
        method: "POST",
        headers: authHeaders(member),
        body: JSON.stringify({ scope: "conversation" }),
      },
    );
    expect(blockedInvite.status).toBe(403);
    expect(await blockedInvite.json()).toMatchObject({ code: "FORBIDDEN" });

    await relayFetch(`/v1/communities/${community.id}/policies`, {
      method: "PATCH",
      headers: authHeaders(organizer),
      body: JSON.stringify({ allowMemberInvites: true }),
    });

    const allowedInvite = await relayJson<{
      inviteToken: string;
      scope: string;
    }>(`/v1/conversations/${community.id}/invites`, {
      method: "POST",
      headers: authHeaders(member),
      body: JSON.stringify({ scope: "conversation" }),
    });
    expect(allowedInvite.inviteToken).toBeTruthy();
    expect(allowedInvite.scope).toBe("conversation");
  });

  it("blocks invite creation and acceptance when invites are frozen", async () => {
    const organizer = await bootstrapAccount(
      "freeze-organizer@example.com",
      "Freeze organizer",
    );
    const joiner = await bootstrapAccount(
      "freeze-joiner@example.com",
      "Freeze joiner",
    );

    const community = await relayJson<{ id: string }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Frozen Community",
        memberAccountIds: [],
        memberCap: 50,
        sensitiveMediaDefault: false,
      }),
    });

    const invite = await relayJson<{ inviteToken: string }>(
      `/v1/conversations/${community.id}/invites`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({ scope: "conversation" }),
      },
    );

    await relayFetch(`/v1/communities/${community.id}/policies`, {
      method: "PATCH",
      headers: authHeaders(organizer),
      body: JSON.stringify({ inviteFreezeEnabled: true }),
    });

    const frozenCreate = await relayFetch(
      `/v1/conversations/${community.id}/invites`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({ scope: "conversation" }),
      },
    );
    expect(frozenCreate.status).toBe(409);
    expect(await frozenCreate.json()).toMatchObject({ code: "INVITES_FROZEN" });

    const frozenAccept = await relayFetch(
      `/v1/conversations/${community.id}/invites/${invite.inviteToken}/accept`,
      {
        method: "POST",
        headers: authHeaders(joiner),
        body: "{}",
      },
    );
    expect(frozenAccept.status).toBe(410);
    expect(await frozenAccept.json()).toMatchObject({
      code: "INVITE_UNAVAILABLE",
    });
  });

  it("room-scoped invite lands the joiner in the target room", async () => {
    const organizer = await bootstrapAccount(
      "room-invite-organizer@example.com",
      "Room invite organizer",
    );
    const joiner = await bootstrapAccount(
      "room-invite-joiner@example.com",
      "Room invite joiner",
    );

    const community = await relayJson<{ id: string }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Room Invite Community",
        memberAccountIds: [],
        memberCap: 50,
        sensitiveMediaDefault: false,
      }),
    });

    const room = await relayJson<{ id: string }>(
      `/v1/communities/${community.id}/rooms`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({
          title: "VIP Lounge",
          roomAccessPolicy: "restricted",
          memberAccountIds: [],
        }),
      },
    );

    const invite = await relayJson<{ inviteToken: string; scope: string }>(
      `/v1/conversations/${community.id}/invites`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({ scope: "room", roomId: room.id }),
      },
    );
    expect(invite.scope).toBe("room");

    const accepted = await relayJson<{
      conversationId: string;
      rootConversationId: string;
    }>(
      `/v1/conversations/${community.id}/invites/${invite.inviteToken}/accept`,
      {
        method: "POST",
        headers: authHeaders(joiner),
        body: "{}",
      },
    );
    expect(accepted.conversationId).toBe(room.id);
    expect(accepted.rootConversationId).toBe(community.id);

    const joinerConversations = await relayJson<Array<{ id: string }>>(
      "/v1/conversations",
      { headers: { authorization: `Bearer ${joiner.accessToken}` } },
    );
    expect(joinerConversations.some((c) => c.id === room.id)).toBe(true);
    expect(joinerConversations.some((c) => c.id === community.id)).toBe(true);
  });

  it("enforces organizer-only room access controls", async () => {
    const organizer = await bootstrapAccount(
      "room-access-organizer@example.com",
      "Room access organizer",
    );
    const member = await bootstrapAccount(
      "room-access-member@example.com",
      "Room access member",
    );

    const community = await relayJson<{ id: string }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Room Access Community",
        memberAccountIds: [member.accountId],
        memberCap: 50,
        sensitiveMediaDefault: false,
      }),
    });

    const room = await relayJson<{ id: string }>(
      `/v1/communities/${community.id}/rooms`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({
          title: "Private Room",
          roomAccessPolicy: "restricted",
          memberAccountIds: [],
        }),
      },
    );

    const nonOrganizerRevoke = await relayFetch(
      `/v1/communities/${community.id}/rooms/${room.id}/members/${organizer.accountId}/remove`,
      {
        method: "POST",
        headers: authHeaders(member),
        body: "{}",
      },
    );
    expect(nonOrganizerRevoke.status).toBe(403);
    expect(await nonOrganizerRevoke.json()).toMatchObject({ code: "FORBIDDEN" });

    const grant = await relayJson<{ added: boolean }>(
      `/v1/communities/${community.id}/rooms/${room.id}/members/${member.accountId}/add`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: "{}",
      },
    );
    expect(grant.added).toBe(true);
  });

  it("removes community member and cascades removal to community rooms", async () => {
    const organizer = await bootstrapAccount(
      "cascade-remove-organizer@example.com",
      "Cascade organizer",
    );
    const member = await bootstrapAccount(
      "cascade-remove-member@example.com",
      "Cascade member",
    );

    const community = await relayJson<{ id: string }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Cascade Community",
        memberAccountIds: [member.accountId],
        memberCap: 50,
        sensitiveMediaDefault: false,
      }),
    });

    const room = await relayJson<{ id: string }>(
      `/v1/communities/${community.id}/rooms`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({
          title: "Member Room",
          roomAccessPolicy: "all_members",
          memberAccountIds: [],
        }),
      },
    );

    const preRemoveConversations = await relayJson<Array<{ id: string }>>(
      "/v1/conversations",
      { headers: { authorization: `Bearer ${member.accessToken}` } },
    );
    expect(preRemoveConversations.some((c) => c.id === room.id)).toBe(true);

    const removed = await relayJson<{ removed: boolean }>(
      `/v1/communities/${community.id}/members/${member.accountId}/remove`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: "{}",
      },
    );
    expect(removed.removed).toBe(true);

    const postRemoveConversations = await relayJson<Array<{ id: string }>>(
      "/v1/conversations",
      { headers: { authorization: `Bearer ${member.accessToken}` } },
    );
    expect(postRemoveConversations.some((c) => c.id === room.id)).toBe(false);
    expect(postRemoveConversations.some((c) => c.id === community.id)).toBe(
      false,
    );
  });

  it("community-scoped search returns only joined-community results and 404s for non-members", async () => {
    const organizer = await bootstrapAccount(
      "scoped-search-organizer@example.com",
      "Search organizer",
    );
    const outsider = await bootstrapAccount(
      "scoped-search-outsider@example.com",
      "Search outsider",
    );
    await updateDisplayName(organizer, "SearchOrg");

    const community = await relayJson<{ id: string }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Scoped Search Community",
        memberAccountIds: [],
        memberCap: 50,
        sensitiveMediaDefault: false,
      }),
    });

    await relayJson<{ id: string }>(
      `/v1/communities/${community.id}/rooms`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({
          title: "Alpha Room",
          roomAccessPolicy: "all_members",
          memberAccountIds: [],
        }),
      },
    );

    const scopedSearch = await relayJson<{
      conversations: Array<{ id: string; title: string }>;
      accounts: Array<{ displayName: string }>;
    }>(`/v1/search?q=Alpha&communityId=${community.id}`, {
      headers: { authorization: `Bearer ${organizer.accessToken}` },
    });
    expect(
      scopedSearch.conversations.some((c) => c.title === "Alpha Room"),
    ).toBe(true);

    const outsiderSearch = await relayFetch(
      `/v1/search?q=Alpha&communityId=${community.id}`,
      { headers: { authorization: `Bearer ${outsider.accessToken}` } },
    );
    expect(outsiderSearch.status).toBe(404);
    expect(await outsiderSearch.json()).toMatchObject({
      code: "COMMUNITY_NOT_FOUND",
    });
  });

  it("treats invalid stored group history mode as device-encrypted on group routes", async () => {
    const owner = await bootstrapAccount(
      "null-history-owner@example.com",
      "Null history owner",
    );
    const group = await relayJson<{ id: string; historyMode: string }>(
      "/v1/groups",
      {
        method: "POST",
        headers: authHeaders(owner),
        body: JSON.stringify({
          title: "Null history group",
          memberAccountIds: [],
          memberCap: 6,
          sensitiveMediaDefault: false,
        }),
      },
    );
    expect(group.historyMode).toBe("device_encrypted");

    executeLocalSql(
      `UPDATE conversations SET history_mode = '' WHERE id = '${group.id}'`,
    );

    const list = await relayJson<Array<{ id: string; historyMode: string }>>(
      "/v1/conversations",
      {
        headers: { authorization: `Bearer ${owner.accessToken}` },
      },
    );
    expect(list.find((entry) => entry.id === group.id)?.historyMode).toBe(
      "device_encrypted",
    );

    const getMessages = await relayFetch(
      `/v1/groups/${group.id}/messages?limit=20`,
      {
        headers: { authorization: `Bearer ${owner.accessToken}` },
      },
    );
    expect(getMessages.status).toBe(409);
    expect(await getMessages.json()).toMatchObject({
      code: "HISTORY_MODE_UNSUPPORTED",
    });

    const postMessage = await relayFetch(`/v1/groups/${group.id}/messages`, {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ text: "Should stay encrypted" }),
    });
    expect(postMessage.status).toBe(409);
    expect(await postMessage.json()).toMatchObject({
      code: "HISTORY_MODE_UNSUPPORTED",
    });
  });

  it("reports operator status and gates the operator surface (non-operator 403)", async () => {
    const operator = await bootstrapAccount(
      "operator-status@example.com",
      "Operator status",
    );
    const normal = await bootstrapAccount(
      "operator-normal@example.com",
      "Normal user",
    );
    executeLocalSql(
      `UPDATE accounts SET is_operator = 1 WHERE id = '${operator.accountId}'`,
    );

    const operatorStatus = await relayJson<{ isOperator: boolean }>(
      "/v1/me/operator-status",
      { headers: { authorization: `Bearer ${operator.accessToken}` } },
    );
    expect(operatorStatus.isOperator).toBe(true);

    const normalStatus = await relayJson<{ isOperator: boolean }>(
      "/v1/me/operator-status",
      { headers: { authorization: `Bearer ${normal.accessToken}` } },
    );
    expect(normalStatus.isOperator).toBe(false);

    const forbidden = await relayFetch("/v1/admin/reports", {
      headers: { authorization: `Bearer ${normal.accessToken}` },
    });
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toMatchObject({ code: "NOT_OPERATOR" });

    const allowed = await relayFetch("/v1/admin/reports", {
      headers: { authorization: `Bearer ${operator.accessToken}` },
    });
    expect(allowed.status).toBe(200);
  });

  it("lets an operator view and action a report through the lifecycle", async () => {
    const operator = await bootstrapAccount(
      "report-operator@example.com",
      "Report operator",
    );
    const reporter = await bootstrapAccount(
      "report-reporter@example.com",
      "Report reporter",
    );
    executeLocalSql(
      `UPDATE accounts SET is_operator = 1 WHERE id = '${operator.accountId}'`,
    );

    const created = await relayJson<{ reportId: string; status: string }>(
      "/v1/reports",
      {
        method: "POST",
        headers: authHeaders(reporter),
        body: JSON.stringify({
          targetAccountId: operator.accountId,
          reason: "harassment",
          disclosedPayload: { note: "test disclosure" },
        }),
      },
    );
    expect(created.status).toBe("open");

    const queue = await relayJson<{
      reports: Array<{ id: string; status: string; reason: string }>;
    }>("/v1/admin/reports?status=open", {
      headers: { authorization: `Bearer ${operator.accessToken}` },
    });
    expect(queue.reports.some((r) => r.id === created.reportId)).toBe(true);

    const detail = await relayJson<{
      id: string;
      disclosedPayload: { note: string };
      reason: string;
    }>(`/v1/admin/reports/${created.reportId}`, {
      headers: { authorization: `Bearer ${operator.accessToken}` },
    });
    expect(detail.disclosedPayload.note).toBe("test disclosure");

    const actioned = await relayJson<{ id: string; status: string }>(
      `/v1/admin/reports/${created.reportId}`,
      {
        method: "PATCH",
        headers: authHeaders(operator),
        body: JSON.stringify({
          status: "actioned",
          resolutionNote: "Revoked the offending session.",
        }),
      },
    );
    expect(actioned.status).toBe("actioned");

    const audit = await relayJson<{
      events: Array<{ action: string; metadata: { reportId?: string } }>;
    }>("/v1/admin/audit-log", {
      headers: { authorization: `Bearer ${operator.accessToken}` },
    });
    expect(
      audit.events.some(
        (e) =>
          e.action === "report_status_update" &&
          e.metadata?.reportId === created.reportId,
      ),
    ).toBe(true);
  });

  it("runs an operator recovery handoff: revokes sessions and re-bootstraps the same account", async () => {
    const operator = await bootstrapAccount(
      "recovery-operator@example.com",
      "Recovery operator",
    );
    const victim = await bootstrapAccount(
      "recovery-victim@example.com",
      "Recovery victim",
    );
    executeLocalSql(
      `UPDATE accounts SET is_operator = 1 WHERE id = '${operator.accountId}'`,
    );

    // The victim has a working session before the handoff.
    const before = await relayFetch("/v1/me", {
      headers: { authorization: `Bearer ${victim.accessToken}` },
    });
    expect(before.status).toBe(200);

    const handoff = await relayJson<{
      accountId: string;
      sessionsRevoked: number;
      completionUrl: string;
    }>(`/v1/admin/accounts/${victim.accountId}/recovery-handoff`, {
      method: "POST",
      headers: authHeaders(operator),
      body: JSON.stringify({ reason: "Lost all devices" }),
    });
    expect(handoff.accountId).toBe(victim.accountId);
    expect(handoff.sessionsRevoked).toBeGreaterThanOrEqual(1);

    // The old session is now rejected.
    const after = await relayFetch("/v1/me", {
      headers: { authorization: `Bearer ${victim.accessToken}` },
    });
    expect(after.status).toBe(401);

    // The minted completion link re-bootstraps a NEW device on the SAME account.
    const token = new URL(handoff.completionUrl).searchParams.get("token");
    expect(token).toBeTruthy();
    const recovered = await relayJson<RelaySession>("/v1/auth/complete", {
      method: "POST",
      headers: { "content-type": "application/json", ...defaultClientHeaders },
      body: JSON.stringify({ completionToken: token, deviceLabel: "Recovered" }),
    });
    expect(recovered.accountId).toBe(victim.accountId);
    expect(recovered.deviceId).not.toBe(victim.deviceId);

    const recoveredMe = await relayFetch("/v1/me", {
      headers: { authorization: `Bearer ${recovered.accessToken}` },
    });
    expect(recoveredMe.status).toBe(200);
  });

  it("grants operator status through the break-glass admin endpoint", async () => {
    const account = await bootstrapAccount(
      "grant-operator-target@example.com",
      "Grant target",
    );

    const before = await relayJson<{ isOperator: boolean }>(
      "/v1/me/operator-status",
      { headers: { authorization: `Bearer ${account.accessToken}` } },
    );
    expect(before.isOperator).toBe(false);

    const granted = await relayFetch("/v1/admin/grant-operator", {
      method: "POST",
      headers: {
        authorization: "Bearer test-admin-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ accountId: account.accountId }),
    });
    expect(granted.status).toBe(200);

    const after = await relayJson<{ isOperator: boolean }>(
      "/v1/me/operator-status",
      { headers: { authorization: `Bearer ${account.accessToken}` } },
    );
    expect(after.isOperator).toBe(true);

    // Wrong secret is rejected.
    const forbidden = await relayFetch("/v1/admin/grant-operator", {
      method: "POST",
      headers: {
        authorization: "Bearer wrong-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ accountId: account.accountId }),
    });
    expect(forbidden.status).toBe(403);
  });

  it("rejects a recovery handoff from a non-operator", async () => {
    const normal = await bootstrapAccount(
      "recovery-nonoperator@example.com",
      "Recovery non-operator",
    );
    const target = await bootstrapAccount(
      "recovery-target@example.com",
      "Recovery target",
    );

    const response = await relayFetch(
      `/v1/admin/accounts/${target.accountId}/recovery-handoff`,
      {
        method: "POST",
        headers: authHeaders(normal),
        body: "{}",
      },
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "NOT_OPERATOR" });
  });

  it("rejects a malformed payload with 400 INVALID_REQUEST", async () => {
    const owner = await bootstrapAccount(
      "malformed-owner@example.com",
      "Malformed owner",
    );

    // Missing required `title`.
    const response = await relayFetch("/v1/communities", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ memberAccountIds: [], memberCap: 50 }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_REQUEST" });
  });

  it("rejects an unauthenticated request with 401", async () => {
    const response = await relayFetch("/v1/me");
    expect(response.status).toBe(401);
  });

  it("enforces the per-IP rate limit on auth/start", async () => {
    const sharedIp = "203.0.113.77";
    let sawRateLimit = false;

    // The per-IP limit is 10 / 15 min. Distinct emails isolate the IP bucket
    // from the per-email limit so the IP cap is what trips.
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await relayFetch("/v1/auth/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": sharedIp,
          ...defaultClientHeaders,
        },
        body: JSON.stringify({
          email: `rate-limit-${attempt}@example.com`,
          inviteToken: "dev-beta-invite",
          deviceLabel: "Rate limit probe",
          ageConfirmed18: true,
        }),
      });

      if (response.status === 429) {
        expect(await response.json()).toMatchObject({ code: "RATE_LIMITED" });
        sawRateLimit = true;
        break;
      }
    }

    expect(sawRateLimit).toBe(true);
  });

  it("exhausts a single-use invite after one acceptance (no double-spend)", async () => {
    const organizer = await bootstrapAccount(
      "exhaust-organizer@example.com",
      "Exhaust organizer",
    );
    const firstJoiner = await bootstrapAccount(
      "exhaust-joiner-1@example.com",
      "Exhaust joiner one",
    );
    const secondJoiner = await bootstrapAccount(
      "exhaust-joiner-2@example.com",
      "Exhaust joiner two",
    );

    const community = await relayJson<{ id: string }>("/v1/communities", {
      method: "POST",
      headers: authHeaders(organizer),
      body: JSON.stringify({
        title: "Exhaustible Community",
        memberAccountIds: [],
        memberCap: 50,
        sensitiveMediaDefault: false,
      }),
    });

    const invite = await relayJson<{ inviteToken: string }>(
      `/v1/conversations/${community.id}/invites`,
      {
        method: "POST",
        headers: authHeaders(organizer),
        body: JSON.stringify({ scope: "conversation", maxUses: 1 }),
      },
    );

    const firstAccept = await relayFetch(
      `/v1/conversations/${community.id}/invites/${invite.inviteToken}/accept`,
      { method: "POST", headers: authHeaders(firstJoiner), body: "{}" },
    );
    expect(firstAccept.status).toBe(200);

    const secondAccept = await relayFetch(
      `/v1/conversations/${community.id}/invites/${invite.inviteToken}/accept`,
      { method: "POST", headers: authHeaders(secondJoiner), body: "{}" },
    );
    expect(secondAccept.status).toBe(410);
    expect(await secondAccept.json()).toMatchObject({
      code: "INVITE_UNAVAILABLE",
    });
  });

  it("blocks requests from suspended accounts and allows access after unsuspend", async () => {
    const alice = await bootstrapAccount(
      "suspended-alice@example.com",
      "Suspended Alice",
    );

    // Confirm pre-suspension access.
    const before = await relayFetch("/v1/me", {
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });
    expect(before.status).toBe(200);

    // Inject suspension directly (bypasses session revoke to keep the token live).
    executeLocalSql(
      `UPDATE accounts SET suspended_at = '2026-06-17T00:00:00.000Z' WHERE id = '${alice.accountId}'`,
    );

    const suspended = await relayFetch("/v1/me", {
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });
    expect(suspended.status).toBe(403);
    expect(await suspended.json()).toMatchObject({ code: "SUSPENDED" });

    // Clear suspension — access is restored.
    executeLocalSql(
      `UPDATE accounts SET suspended_at = NULL WHERE id = '${alice.accountId}'`,
    );

    const restored = await relayFetch("/v1/me", {
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });
    expect(restored.status).toBe(200);
  });

  it("operator can suspend and unsuspend an account through the console", async () => {
    const operator = await bootstrapAccount(
      "suspend-operator@example.com",
      "Suspend operator",
    );
    const victim = await bootstrapAccount(
      "suspend-victim@example.com",
      "Suspend victim",
    );
    executeLocalSql(
      `UPDATE accounts SET is_operator = 1 WHERE id = '${operator.accountId}'`,
    );

    // Before suspension — lookup shows not suspended.
    const before = await relayJson<{
      account: { isSuspended: boolean; suspendedAt: string | null };
    }>(`/v1/admin/accounts/lookup?q=${victim.accountId}`, {
      headers: { authorization: `Bearer ${operator.accessToken}` },
    });
    expect(before.account?.isSuspended).toBe(false);
    expect(before.account?.suspendedAt).toBeNull();

    // Suspend.
    const suspendResult = await relayJson<{ suspended: boolean }>(
      `/v1/admin/accounts/${victim.accountId}/suspend`,
      {
        method: "POST",
        headers: authHeaders(operator),
        body: JSON.stringify({ reason: "test suspension" }),
      },
    );
    expect(suspendResult.suspended).toBe(true);

    // Victim's session was revoked — old token returns 401.
    const blocked = await relayFetch("/v1/me", {
      headers: { authorization: `Bearer ${victim.accessToken}` },
    });
    expect(blocked.status).toBe(401);

    // Lookup now shows suspended.
    const during = await relayJson<{
      account: { isSuspended: boolean; suspensionReason: string | null };
    }>(`/v1/admin/accounts/lookup?q=${victim.accountId}`, {
      headers: { authorization: `Bearer ${operator.accessToken}` },
    });
    expect(during.account?.isSuspended).toBe(true);
    expect(during.account?.suspensionReason).toBe("test suspension");

    // Unsuspend.
    const unsuspendResult = await relayJson<{ suspended: boolean }>(
      `/v1/admin/accounts/${victim.accountId}/unsuspend`,
      {
        method: "POST",
        headers: authHeaders(operator),
        body: "{}",
      },
    );
    expect(unsuspendResult.suspended).toBe(false);

    // Lookup shows no longer suspended.
    const after = await relayJson<{ account: { isSuspended: boolean } }>(
      `/v1/admin/accounts/lookup?q=${victim.accountId}`,
      { headers: { authorization: `Bearer ${operator.accessToken}` } },
    );
    expect(after.account?.isSuspended).toBe(false);
  });

  it("PATCH /v1/admin/reports/batch updates multiple reports in one call", async () => {
    const reporter = await bootstrapAccount("batch-reporter@example.com", "Batch reporter");
    const operator = await bootstrapAccount("batch-operator@example.com", "Batch operator");
    executeLocalSql(
      `UPDATE accounts SET is_operator = 1 WHERE id = '${operator.accountId}'`,
    );

    // File two reports.
    const r1 = await relayJson<{ id: string }>("/v1/reports", {
      method: "POST",
      headers: authHeaders(reporter),
      body: JSON.stringify({
        targetAccountId: operator.accountId,
        reason: "spam",
        disclosedPayload: {},
      }),
    });
    const r2 = await relayJson<{ id: string }>("/v1/reports", {
      method: "POST",
      headers: authHeaders(reporter),
      body: JSON.stringify({
        targetAccountId: operator.accountId,
        reason: "harassment",
        disclosedPayload: {},
      }),
    });

    // Batch-dismiss both.
    const batch = await relayJson<{ updated: number; status: string }>("/v1/admin/reports/batch", {
      method: "PATCH",
      headers: authHeaders(operator),
      body: JSON.stringify({
        ids: [r1.id, r2.id],
        status: "dismissed",
        resolutionNote: "batch test",
      }),
    });
    expect(batch.updated).toBe(2);
    expect(batch.status).toBe("dismissed");

    // Verify both are now dismissed.
    const detail1 = await relayJson<{ status: string }>(
      `/v1/admin/reports/${r1.id}`,
      { headers: authHeaders(operator) },
    );
    expect(detail1.status).toBe("dismissed");
  });

  it("GET /v1/me/passkeys returns empty array for a fresh account", async () => {
    const user = await bootstrapAccount("passkey-list@example.com", "List device");
    const passkeys = await relayJson<
      Array<{ credentialId: string; transports: string[]; createdAt: string }>
    >("/v1/me/passkeys", { headers: authHeaders(user) });
    expect(Array.isArray(passkeys)).toBe(true);
    expect(passkeys.length).toBe(0);
  });

  it("POST /v1/passkeys/register/options returns valid options shape", async () => {
    const user = await bootstrapAccount("passkey-opts@example.com", "Opts device");
    const options = await relayJson<{
      challenge: string;
      rp: { id: string; name: string };
      user: { id: string; name: string };
      pubKeyCredParams: Array<{ type: string; alg: number }>;
    }>("/v1/passkeys/register/options", {
      method: "POST",
      headers: authHeaders(user),
      body: "{}",
    });
    expect(typeof options.challenge).toBe("string");
    expect(options.rp.name).toBe("EmberChamber");
    expect(Array.isArray(options.pubKeyCredParams)).toBe(true);
  });

  it("POST /v1/passkeys/register/verify rejects a bad attestation", async () => {
    const user = await bootstrapAccount("passkey-bad-reg@example.com", "Bad reg device");
    // Obtain a challenge first so one exists in the DB.
    await relayFetch("/v1/passkeys/register/options", {
      method: "POST",
      headers: authHeaders(user),
      body: "{}",
    });
    const bad = await relayFetch("/v1/passkeys/register/verify", {
      method: "POST",
      headers: authHeaders(user),
      body: JSON.stringify({
        response: {
          id: "AAAAAAAAAAAAAAAAAAAAAA",
          rawId: "AAAAAAAAAAAAAAAAAAAAAA",
          response: {
            clientDataJSON: "bad",
            attestationObject: "bad",
          },
          clientExtensionResults: {},
          type: "public-key",
        },
      }),
    });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ code: "VERIFICATION_FAILED" });
  });

  it("POST /v1/passkeys/auth/options returns challengeToken and options", async () => {
    const result = await relayJson<{
      challengeToken: string;
      options: { challenge: string; rpId: string };
    }>("/v1/passkeys/auth/options", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(typeof result.challengeToken).toBe("string");
    expect(typeof result.options.challenge).toBe("string");
  });

  it("POST /v1/passkeys/auth/verify with expired challenge token returns 410", async () => {
    const bad = await relayFetch("/v1/passkeys/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeToken: randomUUID(),
        response: {
          id: "AAAAAAAAAAAAAAAAAAAAAA",
          rawId: "AAAAAAAAAAAAAAAAAAAAAA",
          response: {
            clientDataJSON: "bad",
            authenticatorData: "bad",
            signature: "bad",
          },
          clientExtensionResults: {},
          type: "public-key",
        },
      }),
    });
    expect(bad.status).toBe(410);
    expect(await bad.json()).toMatchObject({ code: "CHALLENGE_EXPIRED" });
  });

  it("POST /v1/passkeys/auth/verify with unknown credential returns 401", async () => {
    // First get a real challengeToken.
    const opts = await relayJson<{ challengeToken: string }>(
      "/v1/passkeys/auth/options",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const bad = await relayFetch("/v1/passkeys/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeToken: opts.challengeToken,
        response: {
          id: "AAAAAAAAAAAAAAAAAAAAAA",
          rawId: "AAAAAAAAAAAAAAAAAAAAAA",
          response: {
            clientDataJSON: "bad",
            authenticatorData: "bad",
            signature: "bad",
          },
          clientExtensionResults: {},
          type: "public-key",
        },
      }),
    });
    expect(bad.status).toBe(401);
    expect(await bad.json()).toMatchObject({ code: "UNKNOWN_CREDENTIAL" });
  });

  it("DELETE /v1/me/passkeys/:credentialId with non-existent credential returns 404", async () => {
    const user = await bootstrapAccount("passkey-del@example.com", "Del device");
    const res = await relayFetch(
      "/v1/me/passkeys/AAAAAAAAAAAAAAAAAAAAAA",
      {
        method: "DELETE",
        headers: authHeaders(user),
      },
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "NOT_FOUND" });
  });
});
