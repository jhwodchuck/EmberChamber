import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import type {
  ContactCard,
  FormMessage,
  MeProfile,
  PrivacyDefaults,
  SessionDescriptor,
} from "../types";
import { styles, theme } from "../styles";
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
  onRefreshSessions: () => void;
  isUploadingAvatar: boolean;
  onShowDeviceLinkQr: () => void;
  onScanDeviceLinkQr: (payload: string) => void | Promise<void>;
  onApproveDeviceLink: () => void;
  onResetDeviceLink: () => void;
  onUpdatePrivacy: <K extends keyof PrivacyDefaults>(key: K, value: PrivacyDefaults[K]) => void;
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
  onRefreshSessions,
  isUploadingAvatar,
  onShowDeviceLinkQr,
  onScanDeviceLinkQr,
  onApproveDeviceLink,
  onResetDeviceLink,
  onUpdatePrivacy,
  onChangeAvatar,
  onSignOut,
}: SettingsScreenProps) {
  const initials = profile?.displayName
    ? profile.displayName.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
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
            <Text style={styles.helper}>Loading your profile and device state…</Text>
          </View>
        ) : (
          <>
            <View style={styles.avatarRow}>
              <Pressable onPress={onChangeAvatar} disabled={isUploadingAvatar}>
                <View style={styles.avatarCircle}>
                  {profile?.avatarUrl ? (
                    <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
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
                <Text style={styles.helper}>{profile?.displayName ?? "Loading…"}</Text>
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
        <Text style={styles.sectionTitle}>Devices</Text>
        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Registration</Text>
            <Text style={styles.metricValueText}>
              {deviceBundleReady ? "Synced" : "Pending"}
            </Text>
            <Text style={styles.helper}>
              {deviceBundleCount} visible bundle{deviceBundleCount === 1 ? "" : "s"} on the relay.
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Vault</Text>
            <Text style={styles.metricValue}>{vaultCount}</Text>
          </View>
        </View>
        {deviceBundleError ? <Text style={styles.errorText}>{deviceBundleError}</Text> : null}

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
        <View style={styles.inlineLabelRow}>
          <Text style={styles.sectionTitle}>Signed-in sessions</Text>
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
                  <Text style={styles.sessionRowTitle}>{item.deviceLabel}</Text>
                  {item.isCurrent ? (
                    <View style={styles.sessionCurrentBadge}>
                      <Text style={styles.sessionCurrentBadgeLabel}>Current</Text>
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
                  Seen {formatSessionTimestamp(item.lastSeenAt)} · Signed in {formatSessionTimestamp(item.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.helper}>Only this device session is visible right now.</Text>
        )}

        {sessionsError ? <Text style={styles.errorText}>{sessionsError}</Text> : null}
      </View>

      {contactCard ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contact token</Text>
          <Text style={styles.sectionBody}>
            Keep this handy for later QR or copy flows without crowding the main messenger view.
          </Text>
          <Text selectable style={styles.codeText}>
            {contactCard.cardToken}
          </Text>
        </View>
      ) : null}

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
            onUpdatePrivacy("secureAppSwitcher", !privacyDefaults.secureAppSwitcher)
          }
        />
      </View>

      <Pressable style={styles.secondaryButton} onPress={onSignOut}>
        <Text style={styles.secondaryButtonLabel}>Sign out</Text>
      </Pressable>
    </ScreenScaffold>
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
