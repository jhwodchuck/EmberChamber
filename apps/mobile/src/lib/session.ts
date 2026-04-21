import type { AuthSession, DeviceKeyBundle } from "../types";
import { STORAGE_KEYS } from "../constants";
import { deviceBundleStorageKey } from "./utils";
import { secureStorageCapability } from "./nativeCapabilities";

export async function loadStoredSession() {
  const raw = await secureStorageCapability.getItem(STORAGE_KEYS.session);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await secureStorageCapability.deleteItem(STORAGE_KEYS.session);
    return null;
  }
}

export async function saveStoredSession(session: AuthSession) {
  await secureStorageCapability.setItem(
    STORAGE_KEYS.session,
    JSON.stringify(session),
  );
}

export async function clearStoredSession() {
  await secureStorageCapability.deleteItem(STORAGE_KEYS.session);
}

export async function loadStoredDeviceBundle(deviceId: string) {
  const raw = await secureStorageCapability.getItem(
    deviceBundleStorageKey(deviceId),
  );
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DeviceKeyBundle["bundle"];
  } catch {
    await secureStorageCapability.deleteItem(deviceBundleStorageKey(deviceId));
    return null;
  }
}

export async function saveStoredDeviceBundle(
  deviceId: string,
  bundle: DeviceKeyBundle["bundle"],
) {
  await secureStorageCapability.setItem(
    deviceBundleStorageKey(deviceId),
    JSON.stringify(bundle),
  );
}
