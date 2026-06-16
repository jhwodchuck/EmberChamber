import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVapidAuthorization,
  sendWebPush,
  type WebPushSubscription,
} from "../src/lib/web-push";
import { decodeBytes, decodeJson, encodeBytes } from "../src/lib/base64url";

/**
 * Generates an ECDSA P-256 key pair and returns it in the raw base64url
 * formats the relay's web-push helper expects:
 *   private — the 32-byte scalar `d` from the JWK
 *   public  — the 65-byte uncompressed point (0x04 || x || y)
 */
async function generateVapidKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const rawPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey),
  );
  return {
    privateKeyBase64url: jwk.d as string,
    publicKeyBase64url: encodeBytes(rawPublic),
    rawPublic,
  };
}

describe("VAPID authorization header", () => {
  it("produces a JWT that verifies against the VAPID public key", async () => {
    const { privateKeyBase64url, publicKeyBase64url, rawPublic } =
      await generateVapidKeyPair();
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc123";
    const subject = "mailto:push@emberchamber.com";

    const header = await buildVapidAuthorization(
      privateKeyBase64url,
      publicKeyBase64url,
      endpoint,
      subject,
    );

    const match = header.match(/^vapid t=(.+),k=(.+)$/);
    expect(match).not.toBeNull();
    const [, jwt, advertisedKey] = match!;

    // The advertised key must be the public key (browser uses it to validate).
    expect(advertisedKey).toBe(publicKeyBase64url);

    const [headerPart, claimsPart, signaturePart] = jwt.split(".");
    expect(headerPart).toBeTruthy();
    expect(claimsPart).toBeTruthy();
    expect(signaturePart).toBeTruthy();

    // Verify the ES256 signature over `${header}.${claims}` with the public key.
    const verifyKey = await crypto.subtle.importKey(
      "raw",
      rawPublic,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifyKey,
      decodeBytes(signaturePart).buffer as ArrayBuffer,
      new TextEncoder().encode(`${headerPart}.${claimsPart}`).buffer as ArrayBuffer,
    );
    expect(valid).toBe(true);
  });

  it("sets aud to the endpoint origin, sub to the subject, and a future exp", async () => {
    const { privateKeyBase64url, publicKeyBase64url } =
      await generateVapidKeyPair();
    const endpoint = "https://updates.push.services.mozilla.com/wpush/v2/xyz";
    const subject = "mailto:ops@emberchamber.com";

    const header = await buildVapidAuthorization(
      privateKeyBase64url,
      publicKeyBase64url,
      endpoint,
      subject,
    );
    const jwt = header.match(/^vapid t=(.+),k=/)![1];
    const claims = decodeJson<{ aud: string; exp: number; sub: string }>(
      jwt.split(".")[1],
    );

    expect(claims.aud).toBe("https://updates.push.services.mozilla.com");
    expect(claims.sub).toBe(subject);
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(claims.exp).toBeGreaterThan(nowSeconds);
    // RFC 8292 caps VAPID JWT lifetime at 24h; we use 12h.
    expect(claims.exp).toBeLessThanOrEqual(nowSeconds + 24 * 3600);
  });

  it("rejects a public key that is not an uncompressed P-256 point", async () => {
    const { privateKeyBase64url } = await generateVapidKeyPair();
    const badPublic = encodeBytes(new Uint8Array(10)); // wrong length
    await expect(
      buildVapidAuthorization(
        privateKeyBase64url,
        badPublic,
        "https://example.com/push/1",
        "mailto:x@y.z",
      ),
    ).rejects.toThrow();
  });
});

describe("sendWebPush result mapping", () => {
  const subscription: WebPushSubscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/device-1",
    p256dh: "BExampleRecipientKey",
    auth: "authsecret",
  };
  let keys: { privateKeyBase64url: string; publicKeyBase64url: string };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function send(status: number) {
    keys ??= await generateVapidKeyPair();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status }),
    );
    return sendWebPush(
      subscription,
      keys.privateKeyBase64url,
      keys.publicKeyBase64url,
      "mailto:push@emberchamber.com",
    );
  }

  it("treats 201 Created as success, not gone", async () => {
    const result = await send(201);
    expect(result.ok).toBe(true);
    expect(result.gone).toBe(false);
    expect(result.status).toBe(201);
  });

  it("treats 410 Gone as a dead subscription", async () => {
    const result = await send(410);
    expect(result.ok).toBe(false);
    expect(result.gone).toBe(true);
  });

  it("treats 404 Not Found as a dead subscription", async () => {
    const result = await send(404);
    expect(result.gone).toBe(true);
  });

  it("treats 500 as a transient failure (not gone)", async () => {
    const result = await send(500);
    expect(result.ok).toBe(false);
    expect(result.gone).toBe(false);
  });

  it("treats a network error as a non-fatal failure with status 0", async () => {
    keys ??= await generateVapidKeyPair();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const result = await sendWebPush(
      subscription,
      keys.privateKeyBase64url,
      keys.publicKeyBase64url,
      "mailto:push@emberchamber.com",
    );
    expect(result.ok).toBe(false);
    expect(result.gone).toBe(false);
    expect(result.status).toBe(0);
  });
});
