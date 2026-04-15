import { useEffect, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import type { FormMessage } from "../types";
import { styles, theme } from "../styles";
import { StatusCard } from "./StatusCard";

type DeviceLinkCardProps = {
  signedIn: boolean;
  deviceLabel: string;
  qrValue: string | null;
  status: DeviceLinkStatus | null;
  message: FormMessage | null;
  isWorking: boolean;
  isApproving: boolean;
  onShowQr: () => void | Promise<void>;
  onScanPayload: (payload: string) => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  onReset: () => void;
};

function describeStatus(status: DeviceLinkStatus | null, signedIn: boolean) {
  if (!status) {
    return signedIn
      ? "Start a QR request from this phone, or scan a waiting QR from the new device."
      : "Use a readable device name, then either show a QR for a signed-in device to scan or scan a trusted-device QR here.";
  }

  switch (status.state) {
    case "waiting_for_source":
      return "Waiting for a signed-in device to scan this QR and attach it to your account.";
    case "pending_claim":
      return "Waiting for the new device to scan this QR and announce its device label.";
    case "pending_approval":
      return signedIn
        ? `${status.requesterLabel} is ready. Approve it on this phone to issue a new session.`
        : `${status.requesterLabel} is waiting for approval from your signed-in device.`;
    case "approved":
      return signedIn
        ? `${status.requesterLabel} has been approved. The new device can finish sign-in now.`
        : `${status.requesterLabel} was approved. Finishing sign-in on this phone now.`;
    case "consumed":
      return `${status.requesterLabel} already finished sign-in with this QR.`;
    case "expired":
      return "This QR expired. Start a fresh device-link request.";
    default:
      return "Device-link status is updating.";
  }
}

function formatExpiry(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString();
}

export function DeviceLinkCard({
  signedIn,
  deviceLabel,
  qrValue,
  status,
  message,
  isWorking,
  isApproving,
  onShowQr,
  onScanPayload,
  onApprove,
  onReset,
}: DeviceLinkCardProps) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerLocked, setScannerLocked] = useState(false);
  const [scannerMessage, setScannerMessage] = useState<FormMessage | null>(
    null,
  );

  useEffect(() => {
    if (!scannerOpen) {
      setScannerLocked(false);
    }
  }, [scannerOpen]);

  async function openScanner() {
    setScannerMessage(null);

    if (cameraPermission?.granted) {
      setScannerOpen(true);
      return;
    }

    const nextPermission = await requestCameraPermission();
    if (nextPermission.granted) {
      setScannerOpen(true);
      return;
    }

    setScannerOpen(false);
    setScannerMessage({
      tone: "warning",
      title: "Camera permission needed",
      body: "Allow camera access to scan a device-link QR on this phone.",
    });
  }

  const description = describeStatus(status, signedIn);
  const expiry = formatExpiry(status?.expiresAt);
  const hasState = !!(qrValue || status || message || scannerMessage);

  return (
    <View style={styles.deviceLinkCard}>
      <Text style={styles.sectionTitle}>
        {signedIn ? "Link another device" : "Link with another device"}
      </Text>
      <Text style={styles.sectionBody}>{description}</Text>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => void onShowQr()}
          style={({ pressed }) => [
            styles.primaryButton,
            styles.buttonRowButton,
            (pressed || isWorking) && styles.primaryButtonPressed,
            isWorking && styles.primaryButtonDisabled,
          ]}
          disabled={isWorking}
        >
          <Text style={styles.primaryButtonLabel}>
            {isWorking ? "Preparing…" : signedIn ? "Show my QR" : "Show QR"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void openScanner()}
          style={({ pressed }) => [
            styles.secondaryButton,
            styles.buttonRowButton,
            pressed && styles.secondaryButtonPressed,
            isWorking && styles.primaryButtonDisabled,
          ]}
          disabled={isWorking}
        >
          <Text style={styles.secondaryButtonLabel}>
            {signedIn ? "Scan new device QR" : "Scan trusted device QR"}
          </Text>
        </Pressable>
      </View>

      {hasState ? (
        <Pressable
          onPress={() => {
            setScannerOpen(false);
            setScannerMessage(null);
            onReset();
          }}
          style={({ pressed }) => [
            styles.tertiaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.tertiaryButtonLabel}>
            Clear device-link state
          </Text>
        </Pressable>
      ) : null}

      {message ? <StatusCard {...message} /> : null}
      {scannerMessage ? <StatusCard {...scannerMessage} /> : null}

      {!signedIn && deviceLabel.trim().length < 3 ? (
        <StatusCard
          tone="info"
          title="Name this phone first"
          body="Use at least 3 characters so the signed-in device can recognize the approval target."
        />
      ) : null}

      {scannerOpen ? (
        <View style={styles.qrScannerCard}>
          <Text style={styles.infoTitle}>Scan a QR code</Text>
          <Text style={styles.infoBody}>
            Point this phone at the QR and keep it steady for a moment.
          </Text>
          <CameraView
            style={styles.qrScannerFrame}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              scannerLocked
                ? undefined
                : (event) => {
                    if (!event.data) {
                      return;
                    }

                    setScannerLocked(true);
                    setScannerOpen(false);
                    void Promise.resolve(onScanPayload(event.data)).finally(
                      () => {
                        setScannerLocked(false);
                      },
                    );
                  }
            }
          />
          <Pressable
            onPress={() => setScannerOpen(false)}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Close scanner</Text>
          </Pressable>
        </View>
      ) : null}

      {qrValue ? (
        <View style={styles.qrDisplayCard}>
          <View style={styles.qrDisplaySurface}>
            <QRCode
              value={qrValue}
              size={220}
              backgroundColor="#ffffff"
              color={theme.colors.background}
            />
          </View>
          <Text style={styles.helper}>
            Keep this QR visible until the other device scans it and the
            approval step is complete.
          </Text>
        </View>
      ) : null}

      {status ? (
        <View style={styles.deviceLinkStatusCard}>
          <StatusCard
            tone={
              status.state === "expired"
                ? "warning"
                : status.state === "consumed"
                  ? "success"
                  : "info"
            }
            title={
              signedIn
                ? "Device-link status"
                : "Waiting for trusted-device approval"
            }
            body={description}
          >
            {expiry ? (
              <Text style={styles.helper}>Expires {expiry}</Text>
            ) : null}
            {status.requesterLabel ? (
              <Text style={styles.helper}>
                Device label: {status.requesterLabel}
              </Text>
            ) : null}
          </StatusCard>

          {signedIn && status.state === "pending_approval" && status.linkId ? (
            <Pressable
              onPress={() => void onApprove()}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isApproving) && styles.primaryButtonPressed,
                isApproving && styles.primaryButtonDisabled,
              ]}
              disabled={isApproving}
            >
              <Text style={styles.primaryButtonLabel}>
                {isApproving ? "Approving…" : "Approve on this phone"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
