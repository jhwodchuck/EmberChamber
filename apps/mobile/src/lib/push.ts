import type { Notification, NotificationResponse } from "expo-notifications";
import { Platform } from "react-native";
import { pushCapability, type NativePushRegistration } from "./nativeCapabilities";

export async function ensurePushRuntimeConfiguredAsync() {
  await pushCapability.ensureRuntimeConfigured();
}

export async function getNativeDevicePushRegistrationAsync(): Promise<NativePushRegistration | null> {
  return pushCapability.getDeviceRegistration();
}

export function getNotificationConversationId(
  notification?: Notification | null,
) {
  const value = notification?.request.content.data?.conversationId;
  return typeof value === "string" && value ? value : null;
}

export function getNotificationReason(
  notification?: Notification | null,
) {
  const value = notification?.request.content.data?.reason;
  return value === "mailbox" || value === "relay_hosted_message" ? value : null;
}

export function addNotificationReceivedListener(
  listener: Parameters<typeof pushCapability.addNotificationReceivedListener>[0],
) {
  return pushCapability.addNotificationReceivedListener(listener);
}

export function addNotificationResponseReceivedListener(
  listener: Parameters<typeof pushCapability.addNotificationResponseReceivedListener>[0],
) {
  return pushCapability.addNotificationResponseReceivedListener(listener);
}

export function addPushTokenRefreshListener(
  listener: Parameters<typeof pushCapability.addPushTokenListener>[0],
) {
  return pushCapability.addPushTokenListener(listener);
}

export function getLastNotificationResponse() {
  return pushCapability.getLastNotificationResponse();
}
