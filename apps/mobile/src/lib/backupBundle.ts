import type * as SQLite from "expo-sqlite";
import type { DeviceKeyBundle } from "@emberchamber/protocol";
import type { ConversationPreference } from "../types";
import {
  dumpGroupMessagesCacheRaw,
  loadConversationPreferences,
  restoreGroupMessagesCache,
  saveConversationPreference,
  type GroupMessagesCacheRow,
} from "./db";
import { loadStoredDeviceBundle, saveStoredDeviceBundle } from "./session";

export type BackupPayload = {
  v: 1;
  exportedAt: string;
  deviceId: string;
  accountId: string;
  deviceKeyBundle: DeviceKeyBundle["bundle"] | null;
  conversationPreferences: ConversationPreference[];
  groupMessagesCache: GroupMessagesCacheRow[];
};

export async function assembleExportPayload(
  db: SQLite.SQLiteDatabase,
  deviceId: string,
  accountId: string,
): Promise<string> {
  const [deviceKeyBundle, conversationPrefsRecord, groupMessagesCache] =
    await Promise.all([
      loadStoredDeviceBundle(deviceId),
      loadConversationPreferences(db, accountId),
      dumpGroupMessagesCacheRaw(db),
    ]);

  const conversationPreferences = Object.values(conversationPrefsRecord);

  const payload: BackupPayload = {
    v: 1,
    exportedAt: new Date().toISOString(),
    deviceId,
    accountId,
    deviceKeyBundle,
    conversationPreferences,
    groupMessagesCache,
  };

  return JSON.stringify(payload);
}

export async function restoreFromPayload(
  payloadJson: string,
  db: SQLite.SQLiteDatabase,
  targetDeviceId: string,
): Promise<{ messageCount: number; preferenceCount: number }> {
  const payload = JSON.parse(payloadJson) as BackupPayload;

  if (payload.v !== 1) {
    throw new Error(`Unsupported backup payload version: ${payload.v}`);
  }

  const restoreOps: Promise<void>[] = [];

  if (payload.deviceKeyBundle && targetDeviceId === payload.deviceId) {
    restoreOps.push(
      saveStoredDeviceBundle(targetDeviceId, payload.deviceKeyBundle),
    );
  }

  for (const pref of payload.conversationPreferences) {
    restoreOps.push(saveConversationPreference(db, payload.accountId, pref));
  }

  await Promise.all(restoreOps);

  if (payload.groupMessagesCache.length > 0) {
    await restoreGroupMessagesCache(db, payload.groupMessagesCache);
  }

  return {
    messageCount: payload.groupMessagesCache.length,
    preferenceCount: payload.conversationPreferences.length,
  };
}
