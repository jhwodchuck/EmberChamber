import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { FormMessage } from "../types";
import { styles, theme } from "../styles";
import { StatusCard } from "../components/StatusCard";

export type ProfileSetupScreenProps = {
  sessionMessage: FormMessage | null;
  profileSetupName: string;
  setProfileSetupName: Dispatch<SetStateAction<string>>;
  profileSetupError: string | null;
  setProfileSetupError: Dispatch<SetStateAction<string | null>>;
  isSubmittingProfile: boolean;
  onSubmit: () => void;
};

export function ProfileSetupScreen(props: ProfileSetupScreenProps) {
  const {
    sessionMessage,
    profileSetupName,
    setProfileSetupName,
    profileSetupError,
    setProfileSetupError,
    isSubmittingProfile,
    onSubmit,
  } = props;

  return (
    <>
      {sessionMessage ? <StatusCard {...sessionMessage} /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Almost there</Text>
        <Text style={styles.sectionBody}>
          Choose the name people in your circles will see. Profile photos can
          wait until the Android client has a real sync path for them.
        </Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="How you'll appear in conversations"
            placeholderTextColor={theme.colors.placeholder}
            style={styles.input}
            value={profileSetupName}
            onChangeText={(v) => {
              setProfileSetupName(v);
              if (profileSetupError) {
                setProfileSetupError(null);
              }
            }}
          />
          <Text style={styles.helper}>Your identity inside EmberChamber.</Text>
        </View>

        {profileSetupError ? (
          <Text style={styles.errorText}>{profileSetupError}</Text>
        ) : null}

        <Pressable
          disabled={isSubmittingProfile || !profileSetupName.trim()}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isSubmittingProfile) && styles.primaryButtonPressed,
            (isSubmittingProfile || !profileSetupName.trim()) &&
              styles.primaryButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {isSubmittingProfile ? "Saving profile…" : "Enter EmberChamber"}
          </Text>
        </Pressable>
      </View>
    </>
  );
}
