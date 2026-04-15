import * as SecureStore from "expo-secure-store";
import type { AuthSession, DeviceKeyBundle } from "../types";
import { STORAGE_KEYS } from "../constants";
import { deviceBundleStorageKey } from "./utils";

export async function loadStoredSession() {
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS.session);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
    return null;
  }
}

export async function saveStoredSession(session: AuthSession) {
  await SecureStore.setItemAsync(STORAGE_KEYS.session, JSON.stringify(session));
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.session);
}

export async function loadStoredDeviceBundle(deviceId: string) {
  const raw = await SecureStore.getItemAsync(deviceBundleStorageKey(deviceId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DeviceKeyBundle["bundle"];
  } catch {
    await SecureStore.deleteItemAsync(deviceBundleStorageKey(deviceId));
    return null;
  }
}

export async function saveStoredDeviceBundle(
  deviceId: string,
  bundle: DeviceKeyBundle["bundle"],
) {
  await SecureStore.setItemAsync(
    deviceBundleStorageKey(deviceId),
    JSON.stringify(bundle),
  );
}
