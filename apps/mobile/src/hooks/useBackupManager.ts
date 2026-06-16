import { useCallback, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import type * as SQLite from "expo-sqlite";
import type { AuthSession } from "../types";
import { assembleExportPayload, restoreFromPayload } from "../lib/backupBundle";
import {
  encryptBackupBundle,
  decryptBackupBundle,
  type EncryptedBackupEnvelope,
} from "../lib/backupCrypto";

type UseBackupManagerParams = {
  session: AuthSession | null;
  db: SQLite.SQLiteDatabase | null;
};

function buildFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `emberchamber-backup-${date}.ecbak`;
}

export function useBackupManager({ session, db }: UseBackupManagerParams) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportBackup = useCallback(
    async (passphrase: string): Promise<{ fileName: string }> => {
      if (!session || !db) {
        throw new Error("Not signed in.");
      }

      if (passphrase.length < 8) {
        throw new Error("Passphrase must be at least 8 characters.");
      }

      setIsExporting(true);
      try {
        const plaintext = await assembleExportPayload(
          db,
          session.deviceId,
          session.accountId,
        );

        const envelope = encryptBackupBundle(plaintext, passphrase);
        const envelopeJson = JSON.stringify(envelope);
        const fileName = buildFileName();

        const safResult =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!safResult.granted) {
          throw new Error("Save location not chosen.");
        }

        const fileUri =
          await FileSystem.StorageAccessFramework.createFileAsync(
            safResult.directoryUri,
            fileName,
            "application/octet-stream",
          );

        await FileSystem.StorageAccessFramework.writeAsStringAsync(
          fileUri,
          envelopeJson,
          { encoding: FileSystem.EncodingType.UTF8 },
        );

        return { fileName };
      } finally {
        setIsExporting(false);
      }
    },
    [session, db],
  );

  const importBackup = useCallback(
    async (
      passphrase: string,
    ): Promise<{ messageCount: number; preferenceCount: number }> => {
      if (!session || !db) {
        throw new Error("Not signed in.");
      }

      if (!passphrase) {
        throw new Error("Passphrase is required.");
      }

      setIsImporting(true);
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: "*/*",
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets.length) {
          throw new Error("No file selected.");
        }

        const asset = result.assets[0];
        const envelopeJson = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const envelope = JSON.parse(envelopeJson) as EncryptedBackupEnvelope;
        const plaintext = decryptBackupBundle(envelope, passphrase);

        return await restoreFromPayload(plaintext, db, session.deviceId);
      } finally {
        setIsImporting(false);
      }
    },
    [session, db],
  );

  return { isExporting, isImporting, exportBackup, importBackup };
}
