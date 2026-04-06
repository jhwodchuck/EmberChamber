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
};

const relaySecrets = {
  EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET: "test-email-encryption-secret",
  EMBERCHAMBER_EMAIL_INDEX_SECRET: "test-email-index-secret",
  EMBERCHAMBER_ACCESS_TOKEN_SECRET: "test-access-token-secret",
  EMBERCHAMBER_REFRESH_TOKEN_SECRET: "test-refresh-token-secret",
  EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET: "test-attachment-token-secret",
  EMBERCHAMBER_PUSH_TOKEN_SECRET: "test-push-token-secret",
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
      oneTimePrekeysB64: [`${session.deviceId}-otp-1`, `${session.deviceId}-otp-2`],
    }),
  });

  expect(response.status).toBe(200);
}

async function registerPushToken(session: RelaySession, token = `fcm-${session.deviceId}-registration-token`) {
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
      finish(() => reject(new Error(`Timed out waiting for websocket rejection ${url}`)));
    }, 5_000);

    socket.onopen = () => {
      socket.close();
      finish(() => reject(new Error(`Websocket unexpectedly opened for ${url}`)));
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
  const group = await relayJson<{ id: string; historyMode: string }>("/v1/groups", {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({
      title,
      memberAccountIds: [],
      memberCap: 6,
      sensitiveMediaDefault: false,
    }),
  });
  executeLocalSql(`UPDATE conversations SET history_mode = 'relay_hosted' WHERE id = '${group.id}'`);
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

    const readyBody = (await ready.json()) as { status: string; checks: Record<string, boolean> };
    expect(readyBody.status).toBe("ok");
    expect(readyBody.checks.db).toBe(true);
    expect(readyBody.checks.cleanupQueue).toBe(true);
  });

  it("lists active sessions with client metadata", async () => {
    const alice = await bootstrapAccount("session-meta@example.com", "Alice Pixel");

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

  it("lists conversations and joined-space metadata search results", async () => {
    const alice = await bootstrapAccount("alice@example.com", "Alice browser");
    const bob = await bootstrapAccount("bob@example.com", "Bob browser");
    await updateDisplayName(alice, "Alice");
    await updateDisplayName(bob, "Bob");

    const dm = await relayJson<{ id: string; historyMode: string }>("/v1/dm/open", {
      method: "POST",
      headers: authHeaders(alice),
      body: JSON.stringify({ peerAccountId: bob.accountId }),
    });

    const group = await relayJson<{ id: string; title?: string; historyMode: string }>("/v1/groups", {
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

    expect(conversations.find((entry) => entry.id === dm.id)?.historyMode).toBe("device_encrypted");
    expect(conversations.find((entry) => entry.id === group.id)?.historyMode).toBe("device_encrypted");

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

    expect(search.conversations.some((entry) => entry.id === group.id)).toBe(true);
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

    const upload = await relayFetch(new URL(ticket.uploadUrl).pathname + new URL(ticket.uploadUrl).search, {
      method: "PUT",
      body: ciphertext,
    });
    expect(upload.status).toBe(200);

    const access = await relayJson<{ attachmentId: string; downloadUrl: string }>(
      `/v1/attachments/${ticket.attachmentId}/access`,
      {
        headers: { authorization: `Bearer ${peer.accessToken}` },
      },
    );

    expect(access.attachmentId).toBe(ticket.attachmentId);
    expect(access.downloadUrl).toContain(`/v1/attachments/download/${ticket.attachmentId}`);
  });

  it("routes encrypted group attachment delivery through mailbox fanout", async () => {
    const owner = await bootstrapAccount("group-owner@example.com", "Group owner");
    const peer = await bootstrapAccount("group-peer@example.com", "Group peer");
    await updateDisplayName(peer, "Group peer");
    await registerOpaqueBundle(owner);
    await registerOpaqueBundle(peer);

    const group = await relayJson<{ id: string; epoch: number; historyMode: string }>("/v1/groups", {
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

    const upload = await relayFetch(new URL(ticket.uploadUrl).pathname + new URL(ticket.uploadUrl).search, {
      method: "PUT",
      body: ciphertext,
    });
    expect(upload.status).toBe(200);

    const unsupportedHistoryResponse = await relayFetch(`/v1/groups/${group.id}/messages?limit=20`, {
      headers: { authorization: `Bearer ${peer.accessToken}` },
    });
    expect(unsupportedHistoryResponse.status).toBe(409);

    const peerBundles = await relayJson<Array<{ deviceId: string }>>(
      `/v1/accounts/${peer.accountId}/device-bundles`,
      {
        headers: { authorization: `Bearer ${owner.accessToken}` },
      },
    );

    const sendResult = await relayJson<{ acceptedEnvelopeIds: string[] }>("/v1/messages/batch", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({
        conversationId: group.id,
        epoch: group.epoch,
        envelopes: [
          {
            recipientDeviceId: peerBundles[0].deviceId,
            ciphertext: Buffer.from(JSON.stringify({ kind: "ember_conversation_v1" })).toString("base64"),
            clientMessageId: "group-attachment-message-1",
            attachmentIds: [ticket.attachmentId],
          },
        ],
      }),
    });
    expect(sendResult.acceptedEnvelopeIds).toHaveLength(1);

    const mailboxSync = await relayJson<{ envelopes: Array<{ attachmentIds: string[] }> }>("/v1/mailbox/sync", {
      headers: { authorization: `Bearer ${peer.accessToken}` },
    });
    expect(mailboxSync.envelopes).toHaveLength(1);
    expect(mailboxSync.envelopes[0]?.attachmentIds).toEqual([ticket.attachmentId]);

    const access = await relayJson<{ attachmentId: string; downloadUrl: string }>(
      `/v1/attachments/${ticket.attachmentId}/access`,
      {
        headers: { authorization: `Bearer ${peer.accessToken}` },
      },
    );
    expect(access.attachmentId).toBe(ticket.attachmentId);
    expect(access.downloadUrl).toContain(`/v1/attachments/download/${ticket.attachmentId}`);
  });

  it("deduplicates mailbox sends by clientMessageId and returns a single envelope", async () => {
    const alice = await bootstrapAccount("mailbox-alice@example.com", "Mailbox Alice");
    const bob = await bootstrapAccount("mailbox-bob@example.com", "Mailbox Bob");

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
    expect(secondSend.duplicateEnvelopeIds).toEqual(firstSend.acceptedEnvelopeIds);

    const sync = await relayJson<{
      envelopes: Array<{ envelopeId: string }>;
    }>("/v1/mailbox/sync", {
      headers: { authorization: `Bearer ${bob.accessToken}` },
    });

    expect(sync.envelopes).toHaveLength(1);
    expect(sync.envelopes[0].envelopeId).toBe(firstSend.acceptedEnvelopeIds[0]);
  });

  it("completes device-link handoff from both QR directions", async () => {
    const owner = await bootstrapAccount("device-link-owner@example.com", "Owner desktop");

    const start = await relayJson<DeviceLinkStartResponse>("/v1/devices/link/start", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ deviceLabel: "Owner desktop" }),
    });

    expect(start.state).toBe("pending_claim");
    const sourceQr = parseDeviceLinkQrPayload(start.qrPayload);
    expect(sourceQr.qrMode).toBe("source_display");

    const claimed = await relayJson<DeviceLinkStatus>("/v1/devices/link/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        qrPayload: start.qrPayload,
        deviceLabel: "Android phone",
      }),
    });
    expect(claimed.state).toBe("pending_approval");
    expect(claimed.requesterLabel).toBe("Android phone");

    const confirmed = await relayJson<DeviceLinkConfirmResponse>("/v1/devices/link/confirm", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ linkId: start.linkId }),
    });
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.state).toBe("approved");

    const completed = await relayJson<RelaySession>("/v1/devices/link/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        linkToken: sourceQr.linkToken,
        qrMode: sourceQr.qrMode,
      }),
    });
    expect(completed.accountId).toBe(owner.accountId);
    expect(completed.deviceId).not.toBe(owner.deviceId);

    const consumedStatus = await relayJson<DeviceLinkStatus>(
      `/v1/devices/link/status?token=${encodeURIComponent(sourceQr.linkToken)}&qrMode=${encodeURIComponent(sourceQr.qrMode)}`
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
      `/v1/devices/link/status?token=${encodeURIComponent(targetLinkToken)}&qrMode=target_display`
    );
    expect(missingStatus.status).toBe(404);
    expect(await missingStatus.json()).toMatchObject({ code: "DEVICE_LINK_NOT_FOUND" });

    const scanned = await relayJson<DeviceLinkStatus>("/v1/devices/link/scan", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ qrPayload: targetQrPayload }),
    });
    expect(scanned.state).toBe("pending_approval");
    expect(scanned.requesterLabel).toBe("Tablet browser");
    expect(scanned.qrMode).toBe("target_display");

    const targetConfirmed = await relayJson<DeviceLinkConfirmResponse>("/v1/devices/link/confirm", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ linkId: scanned.linkId }),
    });
    expect(targetConfirmed.state).toBe("approved");

    const targetCompleted = await relayJson<RelaySession>("/v1/devices/link/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        linkToken: targetLinkToken,
        qrMode: "target_display",
      }),
    });
    expect(targetCompleted.accountId).toBe(owner.accountId);
    expect(targetCompleted.deviceId).not.toBe(owner.deviceId);
  });

  it("registers and clears a native push token for the current device", async () => {
    const alice = await bootstrapAccount("push-alice@example.com", "Push Alice");

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
    const alice = await bootstrapAccount("revoked-ws@example.com", "Revoked websocket device");
    const groupId = await createRelayHostedGroup(alice, "Revoked WS group");

    const mailboxSocket = await openWebSocket(
      relayWebSocketUrl(`/v1/mailbox/ws?token=${encodeURIComponent(alice.accessToken)}`),
    );
    mailboxSocket.close();

    const conversationSocket = await openWebSocket(
      relayWebSocketUrl(`/v1/conversations/${groupId}/ws?token=${encodeURIComponent(alice.accessToken)}`),
    );
    conversationSocket.close();

    const revokeResponse = await relayFetch(`/v1/sessions/${alice.sessionId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${alice.accessToken}` },
    });
    expect(revokeResponse.status).toBe(200);

    await expectWebSocketRejected(
      relayWebSocketUrl(`/v1/mailbox/ws?token=${encodeURIComponent(alice.accessToken)}`),
    );

    await expectWebSocketRejected(
      relayWebSocketUrl(`/v1/conversations/${groupId}/ws?token=${encodeURIComponent(alice.accessToken)}`),
    );
  });

  it("updates group settings with dynamic PATCH combinations", async () => {
    const owner = await bootstrapAccount("group-patch-owner@example.com", "Group patch owner");
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
      body: JSON.stringify({ title: "Patch both fields", sensitiveMediaDefault: false }),
    });
    expect(bothFields.status).toBe(200);

    const groups = await relayJson<Array<{ id: string; title?: string; sensitiveMediaDefault?: boolean }>>(
      "/v1/groups",
      {
        headers: { authorization: `Bearer ${owner.accessToken}` },
      },
    );

    expect(groups.find((entry) => entry.id === group.id)).toMatchObject({
      title: "Patch both fields",
      sensitiveMediaDefault: false,
    });
  });

  it("treats invalid stored group history mode as device-encrypted on group routes", async () => {
    const owner = await bootstrapAccount("null-history-owner@example.com", "Null history owner");
    const group = await relayJson<{ id: string; historyMode: string }>("/v1/groups", {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({
        title: "Null history group",
        memberAccountIds: [],
        memberCap: 6,
        sensitiveMediaDefault: false,
      }),
    });
    expect(group.historyMode).toBe("device_encrypted");

    executeLocalSql(`UPDATE conversations SET history_mode = '' WHERE id = '${group.id}'`);

    const list = await relayJson<Array<{ id: string; historyMode: string }>>("/v1/conversations", {
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(list.find((entry) => entry.id === group.id)?.historyMode).toBe("device_encrypted");

    const getMessages = await relayFetch(`/v1/groups/${group.id}/messages?limit=20`, {
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(getMessages.status).toBe(409);
    expect(await getMessages.json()).toMatchObject({ code: "HISTORY_MODE_UNSUPPORTED" });

    const postMessage = await relayFetch(`/v1/groups/${group.id}/messages`, {
      method: "POST",
      headers: authHeaders(owner),
      body: JSON.stringify({ text: "Should stay encrypted" }),
    });
    expect(postMessage.status).toBe(409);
    expect(await postMessage.json()).toMatchObject({ code: "HISTORY_MODE_UNSUPPORTED" });
  });
});
