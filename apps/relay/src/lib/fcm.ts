import { encodeBytes, encodeJson } from "./base64url";

type FcmServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

export type FcmNotificationPayload = {
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
  collapseKey?: string;
  ttlSeconds?: number;
  restrictedPackageName?: string;
};

type FcmAccessTokenCacheEntry = {
  cacheKey: string;
  accessToken: string;
  expiresAtMs: number;
};

let cachedAccessToken: FcmAccessTokenCacheEntry | null = null;

function parseServiceAccount(serviceAccountJson: string): FcmServiceAccount {
  const parsed = JSON.parse(serviceAccountJson) as Partial<FcmServiceAccount>;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FCM service account JSON is missing required fields.");
  }

  return {
    project_id: parsed.project_id,
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    token_uri: parsed.token_uri ?? "https://oauth2.googleapis.com/token",
  };
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    pemToDer(privateKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
}

async function mintJwtAssertion(
  serviceAccount: FcmServiceAccount,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const header = encodeJson({ alg: "RS256", typ: "JWT" });
  const payload = encodeJson({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: expiresAt,
  });
  const unsigned = `${header}.${payload}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${encodeBytes(new Uint8Array(signature))}`;
}

async function getAccessToken(serviceAccountJson: string): Promise<{
  accessToken: string;
  projectId: string;
}> {
  const serviceAccount = parseServiceAccount(serviceAccountJson);
  const cacheKey = `${serviceAccount.project_id}:${serviceAccount.client_email}`;
  if (
    cachedAccessToken &&
    cachedAccessToken.cacheKey === cacheKey &&
    cachedAccessToken.expiresAtMs - 60_000 > Date.now()
  ) {
    return {
      accessToken: cachedAccessToken.accessToken,
      projectId: serviceAccount.project_id,
    };
  }

  const jwtAssertion = await mintJwtAssertion(serviceAccount);
  const response = await fetch(
    serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwtAssertion,
      }).toString(),
    },
  );

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Unable to mint Firebase access token (${response.status}): ${bodyText}`,
    );
  }

  const body = JSON.parse(bodyText) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) {
    throw new Error(
      "Firebase access token response did not include an access token.",
    );
  }

  cachedAccessToken = {
    cacheKey,
    accessToken: body.access_token,
    expiresAtMs: Date.now() + (body.expires_in ?? 3600) * 1000,
  };

  return {
    accessToken: body.access_token,
    projectId: serviceAccount.project_id,
  };
}

function isInvalidTokenResponse(status: number, bodyText: string): boolean {
  if (status === 404) {
    return true;
  }

  if (status !== 400) {
    return false;
  }

  return /UNREGISTERED|registration token|Requested entity was not found|not a valid FCM registration token/i.test(
    bodyText,
  );
}

export async function sendFcmNotification(
  serviceAccountJson: string,
  payload: FcmNotificationPayload,
): Promise<{
  ok: boolean;
  invalidToken: boolean;
  status: number;
  bodyText: string;
}> {
  const { accessToken, projectId } = await getAccessToken(serviceAccountJson);
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        message: {
          token: payload.token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data,
          android: {
            priority: "HIGH",
            ttl: `${Math.max(30, payload.ttlSeconds ?? 90)}s`,
            collapseKey: payload.collapseKey,
            restrictedPackageName: payload.restrictedPackageName,
            notification: {
              channelId: "messages",
              defaultSound: true,
              clickAction: "DEFAULT",
            },
          },
        },
      }),
    },
  );

  const bodyText = await response.text();
  return {
    ok: response.ok,
    invalidToken: isInvalidTokenResponse(response.status, bodyText),
    status: response.status,
    bodyText,
  };
}
