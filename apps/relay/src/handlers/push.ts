import { requireAuth } from "../middleware/auth";
import { webPushSubscribeSchema } from "../schemas";
import { dbRun } from "../lib/d1";
import { HttpError, json, readJson } from "../lib/http";
import type { Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const { pathname } = url;

  // Expose VAPID public key — required by the browser to subscribe.
  // This endpoint is intentionally unauthenticated (the public key is not secret).
  if (request.method === "GET" && pathname === "/v1/push/vapid-public-key") {
    if (!env.EMBERCHAMBER_VAPID_PUBLIC_KEY) {
      return json(
        { error: "Web push is not configured on this relay." },
        { status: 503 },
      );
    }
    return json({ publicKey: env.EMBERCHAMBER_VAPID_PUBLIC_KEY });
  }

  if (pathname !== "/v1/push/web-subscribe") return null;

  if (request.method === "POST") {
    const auth = await requireAuth(request, env);

    if (!env.EMBERCHAMBER_VAPID_PUBLIC_KEY || !env.EMBERCHAMBER_VAPID_PRIVATE_KEY) {
      throw new HttpError(
        503,
        "Web push is not configured on this relay.",
        "PUSH_NOT_CONFIGURED",
      );
    }

    const body = webPushSubscribeSchema.parse(await readJson(request));
    const now = new Date().toISOString();

    await dbRun(
      env.DB,
      `INSERT INTO web_push_subscriptions
         (device_id, account_id, endpoint, p256dh, auth, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
       ON CONFLICT(device_id) DO UPDATE SET
         endpoint = excluded.endpoint,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         updated_at = excluded.updated_at,
         last_push_error = NULL`,
      auth.deviceId,
      auth.accountId,
      body.endpoint,
      body.p256dh,
      body.auth,
      now,
    );

    return json({ subscribed: true });
  }

  if (request.method === "DELETE") {
    const auth = await requireAuth(request, env);
    await dbRun(
      env.DB,
      `DELETE FROM web_push_subscriptions WHERE device_id = ?1`,
      auth.deviceId,
    );
    return json({ unsubscribed: true });
  }

  return null;
}
