import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import type {
  ContactCard,
  FormMessage,
  MeProfile,
  PrivacyDefaults,
} from "../types";
import { styles, theme } from "../styles";
import { DeviceLinkCard } from "../components/DeviceLinkCard";
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
    <ScrollView style={styles.screenScroll} contentContainerStyle={styles.screenScrollContent}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Settings</Text>
        <Text style={styles.screenSubtitle}>
          Privacy defaults, device linking, and account state live here instead of on your chat home.
        </Text>
      </View>

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
    </ScrollView>
  );
}
