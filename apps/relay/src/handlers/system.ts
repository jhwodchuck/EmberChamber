import { json } from "../lib/http";
import type { Env } from "../types";

export async function handle(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  const pathname = url.pathname;

  if (request.method === "GET" && pathname === "/health") {
    return json({
      status: "ok",
      relay: "cloudflare-workers",
      localAutoconnectMarker:
        env.EMBERCHAMBER_LOCAL_AUTOCONNECT_MARKER ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method === "GET" && pathname === "/ready") {
    let dbReady = false;
    let dbError: string | undefined;

    try {
      await env.DB.exec("SELECT 1");
      dbReady = true;
    } catch (error) {
      dbError =
        error instanceof Error
          ? error.message
          : "D1 readiness check failed";
    }

    const checks = {
      db: dbReady,
      attachments: Boolean(env.ATTACHMENTS),
      deviceMailbox: Boolean(env.DEVICE_MAILBOX),
      groupCoordinator: Boolean(env.GROUP_COORDINATOR),
      rateLimiter: Boolean(env.RATE_LIMITER),
      emailQueue: Boolean(env.EMAIL_QUEUE),
      pushQueue: Boolean(env.PUSH_QUEUE),
      cleanupQueue: Boolean(env.CLEANUP_QUEUE),
      accessTokenSecret: Boolean(env.EMBERCHAMBER_ACCESS_TOKEN_SECRET),
      attachmentTokenSecret: Boolean(
        env.EMBERCHAMBER_ATTACHMENT_TOKEN_SECRET,
      ),
      emailEncryptionSecret: Boolean(
        env.EMBERCHAMBER_EMAIL_ENCRYPTION_SECRET,
      ),
      emailIndexSecret: Boolean(env.EMBERCHAMBER_EMAIL_INDEX_SECRET),
    };

    // Optional feature secrets — absent means graceful degradation, not a hard failure.
    const features = {
      pushTokenSecret: Boolean(env.EMBERCHAMBER_PUSH_TOKEN_SECRET),
      fcmServiceAccountJson: Boolean(
        env.EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON,
      ),
    };

    const ready = Object.values(checks).every(Boolean);
    const pushConfigured =
      features.pushTokenSecret && features.fcmServiceAccountJson;

    return json(
      {
        status: ready ? "ok" : "degraded",
        relay: "cloudflare-workers",
        timestamp: new Date().toISOString(),
        checks,
        features,
        pushConfigured,
        ...(dbError ? { dbError } : {}),
      },
      { status: ready ? 200 : 503 },
    );
  }

  return null;
}
