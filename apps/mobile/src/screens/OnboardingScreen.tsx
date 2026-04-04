import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { DeviceLinkStatus } from "@emberchamber/protocol";
import type { Field, FormMessage, MagicLinkResponse } from "../types";
import { styles, theme } from "../styles";
import { DeviceLinkCard } from "../components/DeviceLinkCard";
import { StatusCard } from "../components/StatusCard";

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
    deviceLinkQrValue,
    deviceLinkStatus,
    deviceLinkMessage,
    isWorkingDeviceLink,
    onShowDeviceLinkQr,
    onScanDeviceLinkQr,
    onResetDeviceLink,
  } = props;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        {authMethod === "device-link" ? "Link this phone" : "Start sign-in"}
      </Text>
      <Text style={styles.sectionBody}>
        {authMethod === "device-link"
          ? "Use a signed-in device to approve this phone. The steps stay short: name it, show or scan a QR, then approve."
          : "Focus on the next action only: name this phone, confirm adults-only access, and open the magic link from your inbox."}
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
              authMethod === "magic-link" ? styles.segmentButtonLabelActive : null,
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
              authMethod === "device-link" ? styles.segmentButtonLabelActive : null,
            ]}
          >
            Link with QR
          </Text>
        </Pressable>
      </View>

      {formMessage ? <StatusCard {...formMessage} /> : null}
      {sessionMessage ? <StatusCard {...sessionMessage} /> : null}

      {authMethod === "magic-link" ? (
        <StatusCard
          tone="info"
          title="Next step"
          body="If you have a trusted group invite, paste it now. Otherwise the email path still gets this phone signed in."
        />
      ) : (
        <StatusCard
          tone="info"
          title="Use a trusted device"
          body="QR linking adds this phone to an existing account. For a brand-new account, switch back to the magic-link path."
        />
      )}

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Device label</Text>
        <TextInput
          placeholder="Android phone"
          placeholderTextColor={theme.colors.placeholder}
          style={[styles.input, errors.deviceLabel ? styles.inputError : null]}
          value={deviceLabel}
          onChangeText={(value) => {
            setDeviceLabel(value);
            if (errors.deviceLabel) {
              setErrors((current) => ({ ...current, deviceLabel: undefined }));
            }
          }}
        />
        <Text style={styles.helper}>
          This is what your signed-in device sees before approving this phone.
        </Text>
        {errors.deviceLabel ? <Text style={styles.errorText}>{errors.deviceLabel}</Text> : null}
      </View>

      {authMethod === "magic-link" ? (
        <>
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Group invite link</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="Paste /invite/{groupId}/{token}"
              placeholderTextColor={theme.colors.placeholder}
              style={[styles.input, errors.groupInvite ? styles.inputError : null]}
              value={inviteInput}
              onChangeText={(value) => {
                setInviteInput(value);
                if (errors.groupInvite) {
                  setErrors((current) => ({ ...current, groupInvite: undefined }));
                }
              }}
            />
            <Text style={styles.helper}>
              Optional, but it can drop you into the right circle right away.
            </Text>
            {errors.groupInvite ? <Text style={styles.errorText}>{errors.groupInvite}</Text> : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Private email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.placeholder}
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) {
                  setErrors((current) => ({ ...current, email: undefined }));
                }
              }}
            />
            <Text style={styles.helper}>Used only for bootstrap and recovery.</Text>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          {inviteFieldVisible ? (
            <View style={styles.fieldBlock}>
              <View style={styles.inlineLabelRow}>
                <Text style={styles.label}>Beta invite token</Text>
                <Pressable
                  onPress={() => {
                    setInviteFieldVisible(false);
                    setInviteToken("");
                    setErrors((current) => ({ ...current, inviteToken: undefined }));
                  }}
                >
                  <Text style={styles.inlineAction}>Hide</Text>
                </Pressable>
              </View>
              <TextInput
                autoCapitalize="none"
                placeholder="Paste your beta invite token"
                placeholderTextColor={theme.colors.placeholder}
                style={[styles.input, errors.inviteToken ? styles.inputError : null]}
                value={inviteToken}
                onChangeText={(value) => {
                  setInviteToken(value);
                  if (errors.inviteToken) {
                    setErrors((current) => ({ ...current, inviteToken: undefined }));
                  }
                }}
              />
              <Text style={styles.helper}>Only needed when the relay asks for broader beta access.</Text>
              {errors.inviteToken ? <Text style={styles.errorText}>{errors.inviteToken}</Text> : null}
            </View>
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>No beta token on hand?</Text>
              <Text style={styles.infoBody}>
                Returning users can continue with email alone. Some new accounts can also bootstrap directly from a valid group invite.
              </Text>
              <Pressable onPress={() => setInviteFieldVisible(true)}>
                <Text style={styles.inlineAction}>Add beta invite token</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={() => {
              setAgeConfirmed18((current) => !current);
              if (errors.ageConfirmed18) {
                setErrors((current) => ({ ...current, ageConfirmed18: undefined }));
              }
            }}
            style={[styles.checkboxCard, errors.ageConfirmed18 ? styles.inputError : null]}
          >
            <View style={[styles.checkboxBox, ageConfirmed18 ? styles.checkboxBoxChecked : null]}>
              <Text style={styles.checkboxMark}>{ageConfirmed18 ? "✓" : ""}</Text>
            </View>
            <View style={styles.checkboxCopy}>
              <Text style={styles.label}>I confirm I am at least 18 years old</Text>
              <Text style={styles.helper}>
                Adults-only access is a permanent product rule.
              </Text>
              {errors.ageConfirmed18 ? <Text style={styles.errorText}>{errors.ageConfirmed18}</Text> : null}
            </View>
          </Pressable>

          <Pressable
            disabled={isSending || isCompleting || !email.trim() || !deviceLabel.trim() || !ageConfirmed18}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSending) && styles.primaryButtonPressed,
              (isSending || isCompleting || !email.trim() || !deviceLabel.trim() || !ageConfirmed18) &&
                styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonLabel}>
              {isSending ? "Sending magic link…" : "Continue"}
            </Text>
          </Pressable>
        </>
      ) : (
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
      )}

      {authMethod === "magic-link" && challenge ? (
        <StatusCard
          tone="success"
          title="Check your inbox"
          body="Open the email link on this phone. If it lands in the browser first, the completion page should hand the token back into EmberChamber."
        >
          {__DEV__ && challenge.debugCompletionToken ? (
            <Pressable
              style={styles.devButton}
              onPress={() => onCompleteMagicLink(challenge.debugCompletionToken!)}
            >
              <Text style={styles.devButtonLabel}>Dev-only: complete on this phone now</Text>
            </Pressable>
          ) : null}
        </StatusCard>
      ) : null}
    </View>
  );
}
