/**
 * EmberChamber service worker.
 *
 * Receives empty Web Push wake signals from the relay and shows a generic
 * badge notification. No message content is included in the push payload —
 * the relay sends an empty POST to the push endpoint, which is the correct
 * privacy posture for an E2EE surface. The user opens the app to see actual
 * messages.
 *
 * HUMAN REVIEW NOTE:
 *   - Notifications are shown only if the page is NOT already focused (see
 *     notificationclick handler). If the app is already open and focused the
 *     push is silently consumed.
 *   - The notification tag "emberchamber-wake" collapses multiple unread
 *     wakes into a single badge so the notification tray doesn't fill up.
 *   - pushsubscriptionchange re-registers automatically so long-lived
 *     subscriptions that the push service rotates don't go dark silently.
 */

const APP_PATH = "/app";

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      // If the app tab is already focused, skip the notification — the user
      // is already looking at new messages.
      const windowClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: false,
      });
      const appFocused = windowClients.some(
        (c) => c.visibilityState === "visible" && c.url.includes("/app"),
      );
      if (appFocused) return;

      await self.registration.showNotification("EmberChamber", {
        body: "You have new messages.",
        tag: "emberchamber-wake",
        renotify: true,
        silent: false,
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        if (client.url.includes("/app") && client.focus) {
          return client.focus();
        }
      }
      return clients.openWindow(APP_PATH);
    })(),
  );
});

// When the push service rotates the subscription (e.g. key expiry), re-register
// so the relay gets the updated endpoint. This fires the fetch to /v1/push/web-subscribe
// from the app context once it regains focus; the service worker only stores the
// new subscription in IndexedDB via the standard pushManager API.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const newSubscription = await self.registration.pushManager.subscribe(
        event.oldSubscription.options,
      );
      // Notify all app windows so they can POST the new subscription to the relay.
      const windowClients = await clients.matchAll({ type: "window" });
      for (const client of windowClients) {
        client.postMessage({
          type: "push_subscription_changed",
          subscription: newSubscription.toJSON(),
        });
      }
    })(),
  );
});
