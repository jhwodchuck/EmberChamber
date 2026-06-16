import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type {
  Field,
  FormMessage,
  GroupInvitePreview,
  MagicLinkResponse,
} from "../../types";
import { styles, theme } from "../../styles";
import { StatusCard } from "../../components/StatusCard";

export type AuthFlowProps = {
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
};

export function AuthFlow(props: AuthFlowProps) {
  const {
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
  } = props;

  return (
    <>
      {formMessage ? <StatusCard {...formMessage} /> : null}
      {sessionMessage ? <StatusCard {...sessionMessage} /> : null}

      <StatusCard
        tone="info"
        title="Next step"
        body="Enter the same private email tied to your account. Returning users can recover with email alone."
      />

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
        {errors.deviceLabel ? (
          <Text style={styles.errorText}>{errors.deviceLabel}</Text>
        ) : null}
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.inlineLabelRow}>
          <Text style={styles.label}>Group invite link</Text>
          {inviteInput.trim() ? (
            <Pressable
              onPress={onPreviewInvite}
              disabled={isPreviewingInvite}
            >
              <Text style={styles.inlineAction}>
                {isPreviewingInvite ? "Previewing…" : "Preview"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <TextInput
          autoCapitalize="none"
          placeholder="Paste /invite/{groupId}/{token}"
          placeholderTextColor={theme.colors.placeholder}
          style={[
            styles.input,
            errors.groupInvite ? styles.inputError : null,
          ]}
          value={inviteInput}
          onChangeText={(value) => {
            setInviteInput(value);
            if (errors.groupInvite) {
              setErrors((current) => ({
                ...current,
                groupInvite: undefined,
              }));
            }
          }}
        />
        <Text style={styles.helper}>
          Optional, but it can drop you into the right circle right away.
        </Text>
        {errors.groupInvite ? (
          <Text style={styles.errorText}>{errors.groupInvite}</Text>
        ) : null}
        {invitePreviewError ? (
          <Text style={styles.errorText}>{invitePreviewError}</Text>
        ) : null}
        {invitePreview ? (
          <View style={styles.inviteReviewCard}>
            <Text style={styles.infoTitle}>
              {invitePreview.group.title}
            </Text>
            <Text style={styles.infoBody}>
              Invited by {invitePreview.invite.inviterDisplayName}. Members{" "}
              {invitePreview.group.memberCount}/
              {invitePreview.group.memberCap}. Status{" "}
              {invitePreview.invite.status}.
            </Text>
            {invitePreview.group.joinRuleText ? (
              <Text style={styles.helper}>
                {invitePreview.group.joinRuleText}
              </Text>
            ) : null}
          </View>
        ) : null}
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
        <Text style={styles.helper}>
          Used only for bootstrap and recovery.
        </Text>
        {errors.email ? (
          <Text style={styles.errorText}>{errors.email}</Text>
        ) : null}
      </View>

      {inviteFieldVisible ? (
        <View style={styles.fieldBlock}>
          <View style={styles.inlineLabelRow}>
            <Text style={styles.label}>Beta invite token</Text>
            <Pressable
              onPress={() => {
                setInviteFieldVisible(false);
                setInviteToken("");
                setErrors((current) => ({
                  ...current,
                  inviteToken: undefined,
                }));
              }}
            >
              <Text style={styles.inlineAction}>Hide</Text>
            </Pressable>
          </View>
          <TextInput
            autoCapitalize="none"
            placeholder="Paste your beta invite token"
            placeholderTextColor={theme.colors.placeholder}
            style={[
              styles.input,
              errors.inviteToken ? styles.inputError : null,
            ]}
            value={inviteToken}
            onChangeText={(value) => {
              setInviteToken(value);
              if (errors.inviteToken) {
                setErrors((current) => ({
                  ...current,
                  inviteToken: undefined,
                }));
              }
            }}
          />
          <Text style={styles.helper}>
            Only needed when the relay asks for broader beta access.
          </Text>
          {errors.inviteToken ? (
            <Text style={styles.errorText}>{errors.inviteToken}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.inviteRevealCard}>
          <Text style={styles.infoTitle}>No beta token on hand?</Text>
          <Text style={styles.infoBody}>
            Returning users can continue with email alone. Some new accounts
            can also bootstrap directly from a valid group invite.
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
            setErrors((current) => ({
              ...current,
              ageConfirmed18: undefined,
            }));
          }
        }}
        style={[
          styles.ageGateCard,
          ageConfirmed18 ? styles.ageGateCardActive : null,
          errors.ageConfirmed18 ? styles.inputError : null,
        ]}
      >
        <View style={styles.ageGateBadge}>
          <Text style={styles.ageGateBadgeText}>18+</Text>
        </View>
        <View style={styles.checkboxCopy}>
          <View style={styles.ageGateHeader}>
            <Text style={styles.label}>
              I confirm I am at least 18 years old
            </Text>
            <View
              style={[
                styles.checkboxBox,
                ageConfirmed18 ? styles.checkboxBoxChecked : null,
              ]}
            >
              <Text style={styles.checkboxMark}>
                {ageConfirmed18 ? "✓" : ""}
              </Text>
            </View>
          </View>
          <Text style={styles.helper}>
            Adults-only access is a permanent product rule and a condition
            of this beta.
          </Text>
          {errors.ageConfirmed18 ? (
            <Text style={styles.errorText}>{errors.ageConfirmed18}</Text>
          ) : null}
        </View>
      </Pressable>

      <Pressable
        disabled={
          isSending ||
          isCompleting ||
          !email.trim() ||
          !deviceLabel.trim() ||
          !ageConfirmed18
        }
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || isSending) && styles.primaryButtonPressed,
          (isSending ||
            isCompleting ||
            !email.trim() ||
            !deviceLabel.trim() ||
            !ageConfirmed18) &&
            styles.primaryButtonDisabled,
        ]}
      >
        <Text style={styles.primaryButtonLabel}>
          {isSending ? "Sending magic link…" : "Continue"}
        </Text>
      </Pressable>

      {challenge ? (
        <StatusCard
          tone="success"
          title="Check your inbox"
          body="Open the email link on this phone. If it lands in the browser first, the completion page should hand the token back into EmberChamber."
        >
          {__DEV__ && challenge.debugCompletionToken ? (
            <Pressable
              style={styles.devButton}
              onPress={() =>
                onCompleteMagicLink(challenge.debugCompletionToken!)
              }
            >
              <Text style={styles.devButtonLabel}>
                Dev-only: complete on this phone now
              </Text>
            </Pressable>
          ) : null}
        </StatusCard>
      ) : null}
    </>
  );
}
