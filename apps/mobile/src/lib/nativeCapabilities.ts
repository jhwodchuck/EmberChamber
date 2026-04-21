import * as Notifications from "expo-notifications";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

const BACKGROUND_NOTIFICATION_TASK = "emberchamber-background-notification";

export type NativePushRegistration = {
  provider: "fcm" | "apns";
  platform: "android" | "ios";
  token: string;
};

export type BackgroundSyncRequest = {
  conversationId?: string;
  reason: "mailbox" | "relay_hosted_message" | "manual";
};

export interface SecureStorageCapability {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export interface AppSecurityCapability {
  preventScreenCapture(): Promise<void>;
  allowScreenCapture(): Promise<void>;
}

export interface BackgroundSyncCapability {
  scheduleMailboxSync(input: BackgroundSyncRequest): Promise<void>;
  cancelMailboxSync(conversationId?: string): Promise<void>;
}

export interface PushCapability {
  ensureRuntimeConfigured(): Promise<void>;
  getDeviceRegistration(): Promise<NativePushRegistration | null>;
  addNotificationReceivedListener: typeof Notifications.addNotificationReceivedListener;
  addNotificationResponseReceivedListener: typeof Notifications.addNotificationResponseReceivedListener;
  addPushTokenListener: typeof Notifications.addPushTokenListener;
  getLastNotificationResponse(): Notifications.NotificationResponse | null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(
    BACKGROUND_NOTIFICATION_TASK,
    async () => Notifications.BackgroundNotificationTaskResult.NoData,
  );
}

export const secureStorageCapability: SecureStorageCapability = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItem: (key) => SecureStore.deleteItemAsync(key),
};

export const appSecurityCapability: AppSecurityCapability = {
  preventScreenCapture: () => ScreenCapture.preventScreenCaptureAsync(),
  allowScreenCapture: () => ScreenCapture.allowScreenCaptureAsync(),
};

export const backgroundSyncCapability: BackgroundSyncCapability = {
  async scheduleMailboxSync() {
    // Expo-managed fallback. This is the architectural seam where a future
    // Android WorkManager-backed implementation can be attached.
  },
  async cancelMailboxSync() {
    // Expo-managed fallback. Intentionally a no-op until native scheduling is added.
  },
};

export const pushCapability: PushCapability = {
  async ensureRuntimeConfigured() {
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
  },
  async getDeviceRegistration() {
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

    const provider =
      token.type === "fcm" || token.type === "android"
        ? "fcm"
        : token.type === "apns" || token.type === "ios"
          ? "apns"
          : null;
    if (!provider) {
      throw new Error(`Unsupported native push token type: ${token.type}`);
    }

    return {
      provider,
      platform: Platform.OS === "android" ? "android" : "ios",
      token: token.data,
    };
  },
  addNotificationReceivedListener:
    Notifications.addNotificationReceivedListener,
  addNotificationResponseReceivedListener:
    Notifications.addNotificationResponseReceivedListener,
  addPushTokenListener: Notifications.addPushTokenListener,
  getLastNotificationResponse: () => Notifications.getLastNotificationResponse(),
};
