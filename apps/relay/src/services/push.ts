import type { Env, PushWakeMessage } from "../types";
import { HttpError } from "../lib/http";
import { dbFirst, dbRun } from "../lib/d1";
import { decryptString } from "../lib/crypto";
import { sendFcmNotification } from "../lib/fcm";
import { sendWebPush, type WebPushSubscription } from "../lib/web-push";

export function requirePushTokenSecret(env: Env): string {
  if (!env.EMBERCHAMBER_PUSH_TOKEN_SECRET) {
    throw new HttpError(
      503,
      "Push registration is not configured on this relay.",
      "PUSH_NOT_CONFIGURED",
    );
  }

  return env.EMBERCHAMBER_PUSH_TOKEN_SECRET;
}

export async function queuePushWake(
  env: Env,
  message: Omit<PushWakeMessage, "type" | "sentAt"> & { sentAt?: string },
) {
  await env.PUSH_QUEUE.send({
    type: "push_wake",
    ...message,
    sentAt: message.sentAt ?? new Date().toISOString(),
  } satisfies PushWakeMessage);
}

export function buildPushWakeNotification(
  previewMode: string | null | undefined,
  message: PushWakeMessage,
): { title: string; body: string } {
  if (previewMode === "expanded") {
    if (message.reason === "relay_hosted_message") {
      return {
        title: message.conversationTitle?.trim() || "Conversation update",
        body: message.senderDisplayName?.trim()
          ? `${message.senderDisplayName} sent a message`
          : "New message waiting in EmberChamber",
      };
    }

    return {
      title: message.senderDisplayName?.trim() || "New secure message",
      body: "Open EmberChamber to sync",
    };
  }

  if (previewMode === "none") {
    return {
      title: "EmberChamber",
      body: "Activity to review",
    };
  }

  return {
    title: "New message",
    body: "Open EmberChamber to sync",
  };
}

export async function deliverPushWake(
  env: Env,
  message: PushWakeMessage,
): Promise<void> {
  if (!env.EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON) {
    return;
  }

  if (!env.EMBERCHAMBER_PUSH_TOKEN_SECRET) {
    console.warn("push_delivery_skipped_missing_secret", {
      deviceId: message.targetDeviceId,
      reason: message.reason,
    });
    return;
  }

  const registration = await dbFirst<{
    device_id: string;
    platform: "android" | "ios";
    provider: "fcm" | "apns";
    app_id: string | null;
    token_ciphertext: string;
    notification_preview_mode: string | null;
  }>(
    env.DB,
    `SELECT
       dpt.device_id,
       dpt.platform,
       dpt.provider,
       dpt.app_id,
       dpt.token_ciphertext,
       a.notification_preview_mode
     FROM device_push_tokens dpt
     JOIN devices d ON d.id = dpt.device_id
     JOIN accounts a ON a.id = dpt.account_id
    WHERE dpt.device_id = ?1
      AND dpt.invalidated_at IS NULL
      AND d.revoked_at IS NULL`,
    message.targetDeviceId,
  );

  if (
    !registration ||
    registration.platform !== "android" ||
    registration.provider !== "fcm"
  ) {
    return;
  }

  const now = new Date().toISOString();
  const token = await decryptString(
    env.EMBERCHAMBER_PUSH_TOKEN_SECRET,
    registration.token_ciphertext,
  );
  const alert = buildPushWakeNotification(
    registration.notification_preview_mode,
    message,
  );
  const result = await sendFcmNotification(
    env.EMBERCHAMBER_FCM_SERVICE_ACCOUNT_JSON,
    {
      token,
      title: alert.title,
      body: alert.body,
      collapseKey: message.conversationId ?? `device-${message.targetDeviceId}`,
      ttlSeconds: 120,
      restrictedPackageName: registration.app_id ?? "com.emberchamber.mobile",
      data: {
        reason: message.reason,
        conversationId: message.conversationId ?? "",
        conversationTitle: message.conversationTitle ?? "",
        senderDisplayName: message.senderDisplayName ?? "",
        historyMode: message.historyMode ?? "",
        messageKind: message.messageKind ?? "",
        sentAt: message.sentAt,
      },
    },
  );

  if (result.ok) {
    await dbRun(
      env.DB,
      `UPDATE device_push_tokens
          SET last_push_attempt_at = ?1,
              last_push_success_at = ?1,
              last_push_error = NULL
        WHERE device_id = ?2`,
      now,
      message.targetDeviceId,
    );
    return;
  }

  if (result.invalidToken) {
    await dbRun(
      env.DB,
      `UPDATE device_push_tokens
          SET last_push_attempt_at = ?1,
              last_push_error = ?2,
              invalidated_at = ?1
        WHERE device_id = ?3`,
      now,
      `invalid_token:${result.status}`,
      message.targetDeviceId,
    );
    return;
  }

  await dbRun(
    env.DB,
    `UPDATE device_push_tokens
        SET last_push_attempt_at = ?1,
            last_push_error = ?2
      WHERE device_id = ?3`,
    now,
    `send_failed:${result.status}`,
    message.targetDeviceId,
  );

  throw new Error(`FCM delivery failed (${result.status}): ${result.bodyText}`);
}

async function deliverWebPushWake(env: Env, targetDeviceId: string): Promise<void> {
  if (!env.EMBERCHAMBER_VAPID_PRIVATE_KEY || !env.EMBERCHAMBER_VAPID_PUBLIC_KEY) return;

  const sub = await dbFirst<WebPushSubscription>(
    env.DB,
    `SELECT endpoint, p256dh, auth FROM web_push_subscriptions WHERE device_id = ?1`,
    targetDeviceId,
  );
  if (!sub) return;

  const subject =
    env.EMBERCHAMBER_VAPID_SUBJECT ?? "mailto:push@emberchamber.com";
  const now = new Date().toISOString();

  const result = await sendWebPush(
    sub,
    env.EMBERCHAMBER_VAPID_PRIVATE_KEY,
    env.EMBERCHAMBER_VAPID_PUBLIC_KEY,
    subject,
  );

  if (result.gone) {
    await dbRun(
      env.DB,
      `DELETE FROM web_push_subscriptions WHERE device_id = ?1`,
      targetDeviceId,
    );
    return;
  }

  if (result.ok) {
    await dbRun(
      env.DB,
      `UPDATE web_push_subscriptions
          SET last_push_attempt_at = ?1, last_push_success_at = ?1, last_push_error = NULL
        WHERE device_id = ?2`,
      now,
      targetDeviceId,
    );
    return;
  }

  await dbRun(
    env.DB,
    `UPDATE web_push_subscriptions
        SET last_push_attempt_at = ?1, last_push_error = ?2
      WHERE device_id = ?3`,
    now,
    `send_failed:${result.status}`,
    targetDeviceId,
  );
}

export async function deliverAllPushWake(
  env: Env,
  message: PushWakeMessage,
): Promise<void> {
  // Try FCM (Android) and Web Push in parallel; failures in one do not block the other.
  await Promise.allSettled([
    deliverPushWake(env, message),
    deliverWebPushWake(env, message.targetDeviceId),
  ]);
}
