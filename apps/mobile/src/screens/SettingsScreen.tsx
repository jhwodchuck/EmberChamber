import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import type {
  ContactCard,
  FormMessage,
  MeProfile,
  PrivacyDefaults,
  SessionDescriptor,
} from "../types";
import { styles, theme } from "../styles";
import { scorePassphrase } from "../lib/backupCrypto";
import { DeviceLinkCard } from "../components/DeviceLinkCard";
import { ScreenScaffold } from "../components/ScreenScaffold";
import { ToggleRow } from "../components/ToggleRow";

export type SettingsScreenProps = {
  isLoadingAccount: boolean;
  profile: MeProfile | null;
  contactCard: ContactCard | null;
  email: string;
  deviceLabel: string;
  deviceBundleReady: boolean;
  deviceBundleCount: number;
  deviceBundleError: string | null;
  vaultCount: number;
  privacyDefaults: PrivacyDefaults;
  deviceLinkQrValue: string | null;
  deviceLinkStatus: DeviceLinkStatus | null;
  deviceLinkMessage: FormMessage | null;
  isWorkingDeviceLink: boolean;
  isApprovingDeviceLink: boolean;
  sessions: SessionDescriptor[];
  isLoadingSessions: boolean;
  sessionsError: string | null;
  isRevokingSession: string | null;
  onRefreshSessions: () => void;
  onRevokeSession: (sessionId: string) => void;
  isUploadingAvatar: boolean;
  isExportingBackup: boolean;
  isImportingBackup: boolean;
  onExportBackup: (passphrase: string) => Promise<{ fileName: string }>;
  onImportBackup: (passphrase: string) => Promise<{ messageCount: number; preferenceCount: number }>;
  onShowDeviceLinkQr: () => void;
  onScanDeviceLinkQr: (payload: string) => void | Promise<void>;
  onApproveDeviceLink: () => void;
  onResetDeviceLink: () => void;
  onUpdatePrivacy: <K extends keyof PrivacyDefaults>(
    key: K,
    value: PrivacyDefaults[K],
  ) => void;
  onChangeAvatar: () => void;
  onSignOut: () => void;
};

export function SettingsScreen({
  isLoadingAccount,
  profile,
  contactCard,
  email,
  deviceLabel,
  deviceBundleReady,
  deviceBundleCount,
  deviceBundleError,
  vaultCount,
  privacyDefaults,
  deviceLinkQrValue,
  deviceLinkStatus,
  deviceLinkMessage,
  isWorkingDeviceLink,
  isApprovingDeviceLink,
  sessions,
  isLoadingSessions,
  sessionsError,
  isRevokingSession,
  onRefreshSessions,
  onRevokeSession,
  isUploadingAvatar,
  isExportingBackup,
  isImportingBackup,
  onExportBackup,
  onImportBackup,
  onShowDeviceLinkQr,
  onScanDeviceLinkQr,
  onApproveDeviceLink,
  onResetDeviceLink,
  onUpdatePrivacy,
  onChangeAvatar,
  onSignOut,
}: SettingsScreenProps) {
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState("");
  const [exportResult, setExportResult] = useState<{
    fileName: string;
  } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importPassphrase, setImportPassphrase] = useState("");
  const [importResult, setImportResult] = useState<{
    messageCount: number;
    preferenceCount: number;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const initials = profile?.displayName
    ? profile.displayName
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <ScreenScaffold
      scrollable
      title="Settings"
      subtitle="Privacy defaults, device linking, and account state live here instead of on your chat home."
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        {isLoadingAccount ? (
          <View style={styles.inlineLoadingRow}>
            <ActivityIndicator size="small" color={theme.colors.textSoft} />
            <Text style={styles.helper}>
              Loading your profile and device state…
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.avatarRow}>
              <Pressable onPress={onChangeAvatar} disabled={isUploadingAvatar}>
                <View style={styles.avatarCircle}>
                  {profile?.avatarUrl ? (
                    <Image
                      source={{ uri: profile.avatarUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                </View>
              </Pressable>
              <View style={{ flex: 1, gap: 4 }}>
                <Pressable
                  onPress={onChangeAvatar}
                  disabled={isUploadingAvatar}
                  style={styles.tertiaryButton}
                >
                  <Text style={styles.tertiaryButtonLabel}>
                    {isUploadingAvatar ? "Uploading…" : "Change photo"}
                  </Text>
                </Pressable>
                <Text style={styles.helper}>
                  {profile?.displayName ?? "Loading…"}
                </Text>
              </View>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Display name</Text>
                <Text style={styles.metricValueText}>
                  {profile?.displayName ?? "Loading…"}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Device</Text>
                <Text style={styles.metricValueText}>{deviceLabel}</Text>
              </View>
            </View>
            <Text style={styles.helper}>{profile?.email ?? email}</Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Device linking</Text>
        <Text style={styles.sectionBody}>
          Add this phone from a trusted session, or show this phone's QR when
          another signed-in device needs approval.
        </Text>
        <DeviceLinkCard
          signedIn
          deviceLabel={deviceLabel}
          qrValue={deviceLinkQrValue}
          status={deviceLinkStatus}
          message={deviceLinkMessage}
          isWorking={isWorkingDeviceLink}
          isApproving={isApprovingDeviceLink}
          onShowQr={onShowDeviceLinkQr}
          onScanPayload={onScanDeviceLinkQr}
          onApprove={onApproveDeviceLink}
          onReset={onResetDeviceLink}
        />
      </View>

      <View style={styles.card}>
        <Pressable
          onPress={() => setDiagnosticsExpanded((current) => !current)}
          style={styles.diagnosticsToggle}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.sectionTitle}>Debug + diagnostics</Text>
            <Text style={styles.sectionBody}>
              Relay registration, vault counts, sessions, and contact token.
            </Text>
          </View>
          <Text style={styles.diagnosticsToggleLabel}>
            {diagnosticsExpanded ? "Hide" : "Show"}
          </Text>
        </Pressable>

        {diagnosticsExpanded ? (
          <>
            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Registration</Text>
                <Text style={styles.metricValueText}>
                  {deviceBundleReady ? "Synced" : "Pending"}
                </Text>
                <Text style={styles.helper}>
                  {deviceBundleCount} visible bundle
                  {deviceBundleCount === 1 ? "" : "s"} on the relay.
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Vault</Text>
                <Text style={styles.metricValue}>{vaultCount}</Text>
              </View>
            </View>
            {deviceBundleError ? (
              <Text style={styles.errorText}>{deviceBundleError}</Text>
            ) : null}

            <View style={styles.inlineLabelRow}>
              <Text style={styles.label}>Signed-in sessions</Text>
              <Pressable onPress={onRefreshSessions}>
                <Text style={styles.inlineAction}>Refresh</Text>
              </Pressable>
            </View>

            {isLoadingSessions && !sessions.length ? (
              <View style={styles.inlineLoadingRow}>
                <ActivityIndicator size="small" color={theme.colors.textSoft} />
                <Text style={styles.helper}>Loading active sessions…</Text>
              </View>
            ) : sessions.length ? (
              <View style={styles.sessionList}>
                {sessions.map((item) => (
                  <View key={item.id} style={styles.sessionRow}>
                    <View style={styles.sessionRowTop}>
                      <Text style={styles.sessionRowTitle}>
                        {item.deviceLabel}
                      </Text>
                      {item.isCurrent ? (
                        <View style={styles.sessionCurrentBadge}>
                          <Text style={styles.sessionCurrentBadgeLabel}>
                            Current
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.sessionRowMeta}>
                      {describeSessionVersion(item)}
                    </Text>
                    <Text style={styles.sessionRowMeta}>
                      {item.deviceModel ?? "Device model unavailable"}
                    </Text>
                    <Text style={styles.sessionRowMeta}>
                      Seen {formatSessionTimestamp(item.lastSeenAt)} · Signed in{" "}
                      {formatSessionTimestamp(item.createdAt)}
                    </Text>
                    {!item.isCurrent ? (
                      <Pressable
                        onPress={() => onRevokeSession(item.id)}
                        disabled={isRevokingSession !== null}
                      >
                        <Text
                          style={[
                            styles.inlineAction,
                            isRevokingSession === item.id
                              ? styles.errorText
                              : null,
                          ]}
                        >
                          {isRevokingSession === item.id
                            ? "Revoking…"
                            : "Revoke"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.helper}>
                Only this device session is visible right now.
              </Text>
            )}

            {sessionsError ? (
              <Text style={styles.errorText}>{sessionsError}</Text>
            ) : null}

            {contactCard ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Contact token</Text>
                <Text style={styles.infoBody}>
                  Keep this handy for later QR or copy flows without crowding
                  the main messenger view.
                </Text>
                <Text selectable style={styles.codeText}>
                  {contactCard.cardToken}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Diagnostics are tucked away</Text>
            <Text style={styles.infoBody}>
              Your chat home stays conversation-first. Open this section only
              when you need relay, vault, or session details.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Notification preview mode</Text>
          <View style={styles.segmentRow}>
            {(["discreet", "expanded", "none"] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[
                  styles.segmentButton,
                  privacyDefaults.notificationPreviewMode === mode
                    ? styles.segmentButtonActive
                    : null,
                ]}
                onPress={() => onUpdatePrivacy("notificationPreviewMode", mode)}
              >
                <Text
                  style={[
                    styles.segmentButtonLabel,
                    privacyDefaults.notificationPreviewMode === mode
                      ? styles.segmentButtonLabelActive
                      : null,
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ToggleRow
          title="Auto-download sensitive media"
          description="Keep this off so intimate media does not silently accumulate on the device."
          value={privacyDefaults.autoDownloadSensitiveMedia}
          onPress={() =>
            onUpdatePrivacy(
              "autoDownloadSensitiveMedia",
              !privacyDefaults.autoDownloadSensitiveMedia,
            )
          }
        />
        <ToggleRow
          title="Allow sensitive export"
          description="Keep this off to discourage saving media outside the private vault."
          value={privacyDefaults.allowSensitiveExport}
          onPress={() =>
            onUpdatePrivacy(
              "allowSensitiveExport",
              !privacyDefaults.allowSensitiveExport,
            )
          }
        />
        <ToggleRow
          title="Secure app switcher"
          description="Request screenshot and app-switcher protection on supported devices."
          value={privacyDefaults.secureAppSwitcher}
          onPress={() =>
            onUpdatePrivacy(
              "secureAppSwitcher",
              !privacyDefaults.secureAppSwitcher,
            )
          }
        />
        <ToggleRow
          title="OLED dark background"
          description="Use a true-black background to save power and cut glow on OLED screens."
          value={privacyDefaults.oledDark}
          onPress={() =>
            onUpdatePrivacy("oledDark", !privacyDefaults.oledDark)
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Device data backup</Text>
        <Text style={styles.sectionBody}>
          Export your message history and conversation preferences as an
          encrypted file. The passphrase is never sent to the relay — keep it
          safe because a lost passphrase makes the backup unrecoverable.
        </Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Export backup</Text>
        <TextInput
          style={styles.textInput}
          value={exportPassphrase}
          onChangeText={(text) => {
            setExportPassphrase(text);
            setExportResult(null);
            setExportError(null);
          }}
          placeholder="Choose a strong passphrase"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {exportPassphrase.length > 0 ? (
          <PassphraseStrength passphrase={exportPassphrase} />
        ) : null}
        {exportError ? (
          <Text style={styles.errorText}>{exportError}</Text>
        ) : null}
        {exportResult ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Backup saved</Text>
            <Text style={styles.infoBody}>{exportResult.fileName}</Text>
          </View>
        ) : null}
        <Pressable
          style={[
            styles.secondaryButton,
            { marginTop: 8 },
            (isExportingBackup || exportPassphrase.length < 8) &&
              styles.disabledButton,
          ]}
          disabled={isExportingBackup || exportPassphrase.length < 8}
          onPress={() => {
            setExportResult(null);
            setExportError(null);
            void onExportBackup(exportPassphrase)
              .then((res) => {
                setExportResult(res);
                setExportPassphrase("");
              })
              .catch((err: unknown) => {
                setExportError(
                  err instanceof Error ? err.message : "Export failed.",
                );
              });
          }}
        >
          <Text style={styles.secondaryButtonLabel}>
            {isExportingBackup ? "Exporting…" : "Export device data"}
          </Text>
        </Pressable>

        <Text style={[styles.label, { marginTop: 16 }]}>Import backup</Text>
        <Text style={styles.helper}>
          Choose the backup file, then enter the passphrase you used when you
          exported it. Your existing message cache will be merged with the
          imported data.
        </Text>
        <TextInput
          style={[styles.textInput, { marginTop: 8 }]}
          value={importPassphrase}
          onChangeText={(text) => {
            setImportPassphrase(text);
            setImportResult(null);
            setImportError(null);
          }}
          placeholder="Backup passphrase"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {importError ? (
          <Text style={styles.errorText}>{importError}</Text>
        ) : null}
        {importResult ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Import complete</Text>
            <Text style={styles.infoBody}>
              Restored {importResult.messageCount} messages and{" "}
              {importResult.preferenceCount} conversation preferences.
            </Text>
          </View>
        ) : null}
        <Pressable
          style={[
            styles.secondaryButton,
            { marginTop: 8 },
            (isImportingBackup || !importPassphrase) && styles.disabledButton,
          ]}
          disabled={isImportingBackup || !importPassphrase}
          onPress={() => {
            setImportResult(null);
            setImportError(null);
            void onImportBackup(importPassphrase)
              .then((res) => {
                setImportResult(res);
                setImportPassphrase("");
              })
              .catch((err: unknown) => {
                setImportError(
                  err instanceof Error ? err.message : "Import failed.",
                );
              });
          }}
        >
          <Text style={styles.secondaryButtonLabel}>
            {isImportingBackup ? "Importing…" : "Choose backup file"}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryButton} onPress={onSignOut}>
        <Text style={styles.secondaryButtonLabel}>Sign out</Text>
      </Pressable>
    </ScreenScaffold>
  );
}

function PassphraseStrength({ passphrase }: { passphrase: string }) {
  const { score, label } = scorePassphrase(passphrase);
  const scoreColors: Record<number, string> = {
    0: theme.colors.errorText,
    1: "#f97316",
    2: "#ca8a04",
    3: "#16a34a",
  };
  return (
    <Text
      style={[
        styles.helper,
        { color: scoreColors[score] ?? theme.colors.textSoft },
      ]}
    >
      Strength: {label}
    </Text>
  );
}

function formatSessionTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeSessionVersion(session: SessionDescriptor) {
  const version = session.clientVersion
    ? `${session.clientVersion}${session.clientBuild ? ` (${session.clientBuild})` : ""}`
    : "Version unknown";
  const platform = session.clientPlatform
    ? `${session.clientPlatform.charAt(0).toUpperCase()}${session.clientPlatform.slice(1)}`
    : "Unknown client";

  return `${platform} · ${version}`;
}
