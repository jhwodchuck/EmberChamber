/**
 * VAPID-authenticated Web Push (RFC 8292).
 *
 * Sends empty (no-payload) push notifications — the service worker receives
 * a push event and shows a generic badge. No message content traverses the
 * push network path, which is the correct privacy posture for E2EE surfaces.
 *
 * Key format:
 *   EMBERCHAMBER_VAPID_PRIVATE_KEY — raw 32-byte EC P-256 scalar, base64url
 *   EMBERCHAMBER_VAPID_PUBLIC_KEY  — raw 65-byte uncompressed EC P-256 point, base64url
 *                                    (this is also the applicationServerKey for the browser)
 *
 * Generate a key pair (once, for a deployment):
 *   npx web-push generate-vapid-keys
 * or:
 *   openssl ecparam -name prime256v1 -genkey -noout -outform DER \
 *     | openssl ec -inform DER -outform DER \
 *     | tail -c 32 | base64 | tr '+/' '-_' | tr -d '='
 */

import { decodeBytes, encodeBytes, encodeJson } from "./base64url";

async function importVapidPrivateKey(
  rawPrivateBase64url: string,
  rawPublicBase64url: string,
): Promise<CryptoKey> {
  // Web Crypto doesn't accept raw EC private keys directly; reconstruct a JWK
  // by pairing the 32-byte scalar with the x/y components from the public key.
  const pubBytes = decodeBytes(rawPublicBase64url); // 0x04 || x[32] || y[32]
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) {
    throw new Error("VAPID public key must be an uncompressed EC P-256 point (65 bytes)");
  }
  const x = encodeBytes(pubBytes.slice(1, 33));
  const y = encodeBytes(pubBytes.slice(33, 65));
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: rawPrivateBase64url,
    x,
    y,
  };
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

export async function buildVapidAuthorization(
  privateKeyBase64url: string,
  publicKeyBase64url: string,
  endpoint: string,
  subject: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const origin = new URL(endpoint).origin;

  const header = encodeJson({ typ: "JWT", alg: "ES256" });
  const claims = encodeJson({ aud: origin, exp, sub: subject });
  const unsigned = `${header}.${claims}`;

  const privateKey = await importVapidPrivateKey(privateKeyBase64url, publicKeyBase64url);
  const sigBytes = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsigned),
  );
  const sig = encodeBytes(new Uint8Array(sigBytes));

  return `vapid t=${unsigned}.${sig},k=${publicKeyBase64url}`;
}

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushResult {
  ok: boolean;
  status: number;
  gone: boolean;
}

export async function sendWebPush(
  subscription: WebPushSubscription,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  subject: string,
): Promise<WebPushResult> {
  const authorization = await buildVapidAuthorization(
    vapidPrivateKey,
    vapidPublicKey,
    subscription.endpoint,
    subject,
  );

  let response: Response;
  try {
    response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        TTL: "120",
        Urgency: "normal",
      },
    });
  } catch (err) {
    console.warn("web_push_network_error", { endpoint: subscription.endpoint.slice(0, 60), err });
    return { ok: false, status: 0, gone: false };
  }

  const gone = response.status === 410 || response.status === 404;
  const ok = response.ok || response.status === 201;
  return { ok, status: response.status, gone };
}
