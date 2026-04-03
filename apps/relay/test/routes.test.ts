import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev } from "wrangler";

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

let worker: Awaited<ReturnType<typeof unstable_dev>>;
let persistPath: string;

async function relayFetch(pathname: string, init?: RequestInit) {
  return worker.fetch(`http://127.0.0.1${pathname}`, init as never);
}

async function relayJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await relayFetch(pathname, init);
  return (await response.json()) as T;
}

async function bootstrapAccount(email: string, deviceLabel: string) {
  const challenge = await relayJson<{
    debugCompletionToken?: string;
  }>("/v1/auth/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
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
    headers: { "content-type": "application/json" },
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
  };
}

function sha256B64(value: string) {
  return createHash("sha256").update(value).digest("base64");
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
    expect(conversations.find((entry) => entry.id === group.id)?.historyMode).toBe("relay_hosted");

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
});
