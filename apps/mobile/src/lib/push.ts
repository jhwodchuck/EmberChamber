import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

const BACKGROUND_NOTIFICATION_TASK = "emberchamber-background-notification";

type NativePushRegistration = {
  provider: "fcm" | "apns";
  platform: "android" | "ios";
  token: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(BACKGROUND_NOTIFICATION_TASK, async () => {
    return Notifications.BackgroundNotificationTaskResult.NoData;
  });
}

export async function ensurePushRuntimeConfiguredAsync() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("messages", {
    name: "Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#d96531",
  });

  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  } catch {
    // Ignore duplicate registration and dev-runtime limitations.
  }
}

export async function getNativeDevicePushRegistrationAsync(): Promise<NativePushRegistration | null> {
  if (Platform.OS !== "android") {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const token = await Notifications.getDevicePushTokenAsync();
  if (typeof token.data !== "string" || !token.data) {
    return null;
  }

  const provider = token.type === "fcm" ? "fcm" : token.type === "apns" ? "apns" : null;
  if (!provider) {
    throw new Error(`Unsupported native push token type: ${token.type}`);
  }

  return {
    provider,
    platform: Platform.OS === "android" ? "android" : "ios",
    token: token.data,
  };
}

export function getNotificationConversationId(notification?: Notifications.Notification | null) {
  const value = notification?.request.content.data?.conversationId;
  return typeof value === "string" && value ? value : null;
}

export function getNotificationReason(notification?: Notifications.Notification | null) {
  const value = notification?.request.content.data?.reason;
  return value === "mailbox" || value === "relay_hosted_message" ? value : null;
}
