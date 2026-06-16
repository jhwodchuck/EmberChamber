import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import type {
  Field,
  FormMessage,
  GroupInvitePreview,
  MagicLinkResponse,
} from "../types";
import { styles, theme } from "../styles";
import { AuthFlow } from "../features/auth/AuthFlow";
import { DeviceLinkFlow } from "../features/deviceLink/DeviceLinkFlow";

export type OnboardingScreenProps = {
  authMethod: "magic-link" | "device-link";
  setAuthMethod: Dispatch<SetStateAction<"magic-link" | "device-link">>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  inviteToken: string;
  setInviteToken: Dispatch<SetStateAction<string>>;
  deviceLabel: string;
  setDeviceLabel: Dispatch<SetStateAction<string>>;
  ageConfirmed18: boolean;
  setAgeConfirmed18: Dispatch<SetStateAction<boolean>>;
  inviteInput: string;
  setInviteInput: Dispatch<SetStateAction<string>>;
  invitePreview: GroupInvitePreview | null;
  invitePreviewError: string | null;
  isPreviewingInvite: boolean;
  inviteFieldVisible: boolean;
  setInviteFieldVisible: Dispatch<SetStateAction<boolean>>;
  isSending: boolean;
  isCompleting: boolean;
  challenge: MagicLinkResponse | null;
  errors: Partial<Record<Field, string>>;
  setErrors: Dispatch<SetStateAction<Partial<Record<Field, string>>>>;
  formMessage: FormMessage | null;
  sessionMessage: FormMessage | null;
  onSubmit: () => void;
  onCompleteMagicLink: (token: string) => void;
  onPreviewInvite: () => void;
  deviceLinkQrValue: string | null;
  deviceLinkStatus: DeviceLinkStatus | null;
  deviceLinkMessage: FormMessage | null;
  isWorkingDeviceLink: boolean;
  onShowDeviceLinkQr: () => void;
  onScanDeviceLinkQr: (payload: string) => void | Promise<void>;
  onResetDeviceLink: () => void;
};

export function OnboardingScreen(props: OnboardingScreenProps) {
  const {
    authMethod,
    setAuthMethod,
    email,
    setEmail,
    inviteToken,
    setInviteToken,
    deviceLabel,
    setDeviceLabel,
    ageConfirmed18,
    setAgeConfirmed18,
    inviteInput,
    setInviteInput,
    invitePreview,
    invitePreviewError,
    isPreviewingInvite,
    inviteFieldVisible,
    setInviteFieldVisible,
    isSending,
    isCompleting,
    challenge,
    errors,
    setErrors,
    formMessage,
    sessionMessage,
    onSubmit,
    onCompleteMagicLink,
    onPreviewInvite,
    deviceLinkQrValue,
    deviceLinkStatus,
    deviceLinkMessage,
    isWorkingDeviceLink,
    onShowDeviceLinkQr,
    onScanDeviceLinkQr,
    onResetDeviceLink,
  } = props;
  const isMagicLink = authMethod === "magic-link";

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        {authMethod === "device-link" ? "Link this phone" : "Start sign-in"}
      </Text>
      <Text style={styles.sectionBody}>
        {authMethod === "device-link"
          ? "Use QR only when another EmberChamber device is still signed in. If every session is gone, switch back to magic link."
          : "Use the account email to recover access when every signed-in device is gone. No password or device-link approval is required."}
      </Text>

      <View style={styles.segmentRow}>
        <Pressable
          onPress={() => setAuthMethod("magic-link")}
          style={[
            styles.segmentButton,
            authMethod === "magic-link" ? styles.segmentButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.segmentButtonLabel,
              authMethod === "magic-link"
                ? styles.segmentButtonLabelActive
                : null,
            ]}
          >
            Magic link
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAuthMethod("device-link")}
          style={[
            styles.segmentButton,
            authMethod === "device-link" ? styles.segmentButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.segmentButtonLabel,
              authMethod === "device-link"
                ? styles.segmentButtonLabelActive
                : null,
            ]}
          >
            Link with QR
          </Text>
        </Pressable>
      </View>

      <View style={styles.onboardingStepRow}>
        {(isMagicLink
          ? [
              ["1", "Access + 18+"],
              ["2", "Inbox link"],
              ["3", "Profile"],
            ]
          : [
              ["1", "Name device"],
              ["2", "Scan QR"],
              ["3", "Approve"],
            ]
        ).map(([number, label], index) => (
          <View
            key={`${number}-${label}`}
            style={[
              styles.onboardingStep,
              index === 0 ? styles.onboardingStepActive : null,
            ]}
          >
            <Text style={styles.onboardingStepNumber}>{number}</Text>
            <Text style={styles.onboardingStepLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {isMagicLink ? (
        <AuthFlow
          email={email}
          setEmail={setEmail}
          inviteToken={inviteToken}
          setInviteToken={setInviteToken}
          deviceLabel={deviceLabel}
          setDeviceLabel={setDeviceLabel}
          ageConfirmed18={ageConfirmed18}
          setAgeConfirmed18={setAgeConfirmed18}
          inviteInput={inviteInput}
          setInviteInput={setInviteInput}
          invitePreview={invitePreview}
          invitePreviewError={invitePreviewError}
          isPreviewingInvite={isPreviewingInvite}
          inviteFieldVisible={inviteFieldVisible}
          setInviteFieldVisible={setInviteFieldVisible}
          isSending={isSending}
          isCompleting={isCompleting}
          challenge={challenge}
          errors={errors}
          setErrors={setErrors}
          formMessage={formMessage}
          sessionMessage={sessionMessage}
          onSubmit={onSubmit}
          onCompleteMagicLink={onCompleteMagicLink}
          onPreviewInvite={onPreviewInvite}
        />
      ) : (
        <DeviceLinkFlow
          deviceLabel={deviceLabel}
          deviceLinkQrValue={deviceLinkQrValue}
          deviceLinkStatus={deviceLinkStatus}
          deviceLinkMessage={deviceLinkMessage}
          isWorkingDeviceLink={isWorkingDeviceLink}
          onShowDeviceLinkQr={onShowDeviceLinkQr}
          onScanDeviceLinkQr={onScanDeviceLinkQr}
          onResetDeviceLink={onResetDeviceLink}
        />
      )}
    </View>
  );
}
