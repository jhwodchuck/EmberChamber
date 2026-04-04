import * as SQLite from "expo-sqlite";
import type {
  GroupMembershipSummary,
  GroupThreadMessage,
  NotificationPreviewMode,
  PrivacyDefaults,
} from "../types";
import { defaultPrivacyDefaults } from "../constants";

const MAX_CACHED_GROUP_MESSAGES = 500;

export async function bootstrapLocalStore() {
  const db = await SQLite.openDatabaseAsync("emberchamber.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS relay_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      title TEXT,
      epoch INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_preferences (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vault_media (
      id TEXT PRIMARY KEY NOT NULL,
      conversation_id TEXT,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      protection_profile TEXT NOT NULL,
      retention_mode TEXT NOT NULL,
      preview_blur_hash TEXT,
      sender_label TEXT,
      created_at TEXT NOT NULL,
      downloaded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS contact_labels (
      account_id TEXT PRIMARY KEY NOT NULL,
      local_label TEXT NOT NULL,
      private_note TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS group_memberships_cache (
      account_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (account_id, conversation_id)
    );
    CREATE INDEX IF NOT EXISTS idx_group_memberships_cache_account
      ON group_memberships_cache (account_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS group_messages_cache (
      conversation_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (conversation_id, message_id)
    );
    CREATE INDEX IF NOT EXISTS idx_group_messages_cache_conversation
      ON group_messages_cache (conversation_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_group_messages_cache_conversation_recent
      ON group_messages_cache (conversation_id, created_at DESC);
  `);

  await Promise.all([
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "notificationPreviewMode",
      defaultPrivacyDefaults.notificationPreviewMode,
    ),
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "autoDownloadSensitiveMedia",
      defaultPrivacyDefaults.autoDownloadSensitiveMedia ? "1" : "0",
    ),
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "allowSensitiveExport",
      defaultPrivacyDefaults.allowSensitiveExport ? "1" : "0",
    ),
    db.runAsync(
      "INSERT OR IGNORE INTO app_preferences (key, value) VALUES (?, ?)",
      "secureAppSwitcher",
      defaultPrivacyDefaults.secureAppSwitcher ? "1" : "0",
    ),
  ]);

  return db;
}

export async function loadPrivacyDefaults(db: SQLite.SQLiteDatabase): Promise<PrivacyDefaults> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    "SELECT key, value FROM app_preferences WHERE key IN (?, ?, ?, ?)",
    "notificationPreviewMode",
    "autoDownloadSensitiveMedia",
    "allowSensitiveExport",
    "secureAppSwitcher",
  );
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));

  return {
    notificationPreviewMode:
      (values.notificationPreviewMode as NotificationPreviewMode | undefined) ??
      defaultPrivacyDefaults.notificationPreviewMode,
    autoDownloadSensitiveMedia: values.autoDownloadSensitiveMedia === "1",
    allowSensitiveExport: values.allowSensitiveExport === "1",
    secureAppSwitcher: values.secureAppSwitcher !== "0",
  };
}

export async function loadRelayStateValue(db: SQLite.SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM relay_state WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

export async function saveRelayStateValue(db: SQLite.SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO relay_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

export async function savePrivacyDefault(
  db: SQLite.SQLiteDatabase,
  key: keyof PrivacyDefaults,
  value: string,
) {
  await db.runAsync(
    "INSERT INTO app_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}

export async function persistVaultMediaRecord(
  db: SQLite.SQLiteDatabase,
  message: GroupThreadMessage,
  senderLabel: string,
) {
  if (!message.attachment) {
    return;
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO vault_media (
       id,
       conversation_id,
       file_name,
       mime_type,
       protection_profile,
       retention_mode,
       preview_blur_hash,
       sender_label,
       created_at,
       downloaded_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    message.attachment.id,
    message.conversationId,
    message.attachment.fileName,
    message.attachment.mimeType,
    message.attachment.protectionProfile,
    message.attachment.retentionMode,
    message.attachment.previewBlurHash ?? null,
    senderLabel,
    message.createdAt,
    new Date().toISOString(),
  );
}

export async function countVaultItems(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM vault_media");
  return row?.count ?? 0;
}

export async function loadCachedGroups(
  db: SQLite.SQLiteDatabase,
  accountId: string,
): Promise<GroupMembershipSummary[]> {
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload
       FROM group_memberships_cache
      WHERE account_id = ?
      ORDER BY updated_at DESC`,
    accountId,
  );

  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.payload) as GroupMembershipSummary];
    } catch {
      return [];
    }
  });
}

export async function saveCachedGroups(
  db: SQLite.SQLiteDatabase,
  accountId: string,
  groups: GroupMembershipSummary[],
) {
  await db.runAsync("DELETE FROM group_memberships_cache WHERE account_id = ?", accountId);

  if (!groups.length) {
    return;
  }

  const updatedAt = new Date().toISOString();
  for (const group of groups) {
    await db.runAsync(
      `INSERT INTO group_memberships_cache (
         account_id,
         conversation_id,
         payload,
         updated_at
       ) VALUES (?, ?, ?, ?)`,
      accountId,
      group.id,
      JSON.stringify(group),
      updatedAt,
    );
  }
}

export async function loadCachedGroupMessages(
  db: SQLite.SQLiteDatabase,
  conversationId: string,
): Promise<GroupThreadMessage[]> {
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload
       FROM group_messages_cache
      WHERE conversation_id = ?
      ORDER BY created_at ASC`,
    conversationId,
  );

  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.payload) as GroupThreadMessage];
    } catch {
      return [];
    }
  });
}

export async function saveCachedGroupMessages(
  db: SQLite.SQLiteDatabase,
  conversationId: string,
  messages: GroupThreadMessage[],
) {
  const recentMessages = messages
    .slice()
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-MAX_CACHED_GROUP_MESSAGES);

  for (const message of recentMessages) {
    await db.runAsync(
      `INSERT INTO group_messages_cache (
         conversation_id,
         message_id,
         payload,
         created_at
       ) VALUES (?, ?, ?, ?)
       ON CONFLICT(conversation_id, message_id) DO UPDATE
         SET payload = excluded.payload,
             created_at = excluded.created_at`,
      conversationId,
      message.id,
      JSON.stringify(message),
      message.createdAt,
    );
  }

  await db.runAsync(
    `DELETE FROM group_messages_cache
      WHERE conversation_id = ?1
        AND message_id NOT IN (
          SELECT message_id
            FROM group_messages_cache
           WHERE conversation_id = ?1
           ORDER BY created_at DESC
           LIMIT ?2
        )`,
    conversationId,
    MAX_CACHED_GROUP_MESSAGES,
  );
}
