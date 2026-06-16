/**
 * Browser-side Web Push utilities.
 *
 * This module handles only the browser API layer (service worker registration,
 * permission requests, and PushManager subscription). Relay HTTP calls go
 * through relayAccountApi in relay.ts.
 *
 * HUMAN REVIEW NOTE:
 *   - `userVisibleOnly: true` is required by all major browsers for push
 *     subscriptions that show notifications. This is correct for our use case.
 *   - The applicationServerKey must match EMBERCHAMBER_VAPID_PUBLIC_KEY on the
 *     relay. A mismatch causes subscribe() to throw a DOMException.
 *   - We request Notification permission only after an explicit user action
 *     (the toggle in Settings > Appearance) — never on page load.
 */

export type PushState =
  | "unsupported"
  | "loading"
  | "denied"
  | "subscribed"
  | "unsubscribed";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("sw_register_failed", err);
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "subscribed" : "unsubscribed";
  } catch {
    return "unsubscribed";
  }
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

export type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function createPushSubscription(
  vapidPublicKey: string,
): Promise<PushSubscriptionPayload | null> {
  if (!isPushSupported()) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
    });

    const json = sub.toJSON() as {
      endpoint: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.keys?.p256dh || !json.keys?.auth) return null;

    return {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    };
  } catch (err) {
    console.warn("push_subscribe_failed", err);
    return null;
  }
}

export async function removePushSubscription(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch (err) {
    console.warn("push_unsubscribe_failed", err);
  }
}

/**
 * Listen for the service worker's `push_subscription_changed` message, emitted
 * by sw.js when the push service rotates a subscription. The handler receives
 * the new subscription (already flattened) so the caller can re-register it
 * with the relay — without this listener the rotated endpoint never reaches the
 * relay and push silently dies. Returns an unsubscribe cleanup.
 */
export function onPushSubscriptionChange(
  handler: (subscription: PushSubscriptionPayload) => void,
): () => void {
  if (!isPushSupported()) return () => {};

  const listener = (event: MessageEvent) => {
    const data = event.data as
      | {
          type?: string;
          subscription?: {
            endpoint?: string;
            keys?: { p256dh?: string; auth?: string };
          };
        }
      | undefined;
    if (!data || data.type !== "push_subscription_changed") return;

    const sub = data.subscription;
    if (sub?.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
      handler({
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      });
    }
  };

  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}
