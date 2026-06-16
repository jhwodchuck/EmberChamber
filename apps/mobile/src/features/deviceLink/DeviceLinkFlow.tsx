import { View } from "react-native";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import type { FormMessage } from "../../types";
import { DeviceLinkCard } from "../../components/DeviceLinkCard";
import { StatusCard } from "../../components/StatusCard";

export type DeviceLinkFlowProps = {
  deviceLabel: string;
  deviceLinkQrValue: string | null;
  deviceLinkStatus: DeviceLinkStatus | null;
  deviceLinkMessage: FormMessage | null;
  isWorkingDeviceLink: boolean;
  onShowDeviceLinkQr: () => void;
  onScanDeviceLinkQr: (payload: string) => void | Promise<void>;
  onResetDeviceLink: () => void;
};

export function DeviceLinkFlow(props: DeviceLinkFlowProps) {
  const {
    deviceLabel,
    deviceLinkQrValue,
    deviceLinkStatus,
    deviceLinkMessage,
    isWorkingDeviceLink,
    onShowDeviceLinkQr,
    onScanDeviceLinkQr,
    onResetDeviceLink,
  } = props;

  return (
    <>
      <DeviceLinkCard
        signedIn={false}
        deviceLabel={deviceLabel}
        qrValue={deviceLinkQrValue}
        status={deviceLinkStatus}
        message={deviceLinkMessage}
        isWorking={isWorkingDeviceLink}
        isApproving={false}
        onShowQr={onShowDeviceLinkQr}
        onScanPayload={onScanDeviceLinkQr}
        onApprove={() => undefined}
        onReset={onResetDeviceLink}
      />

      <StatusCard
        tone="info"
        title="Fallback stays available"
        body="If the camera is unavailable, the QR expires, or this is your first device on a new account, switch back to the magic-link path."
      />
    </>
  );
}
