import type { Dispatch, SetStateAction } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import type { FormMessage, PendingAttachment } from "../types";
import { styles } from "../styles";
import { StatusCard } from "../components/StatusCard";

export type ProfileSetupScreenProps = {
  sessionMessage: FormMessage | null;
  profileSetupName: string;
  setProfileSetupName: Dispatch<SetStateAction<string>>;
  profileSetupSelfie: PendingAttachment | null;
  profileSetupError: string | null;
  setProfileSetupError: Dispatch<SetStateAction<string | null>>;
  isPickingSelfie: boolean;
  isSubmittingProfile: boolean;
  onPickSelfie: () => void;
  onSubmit: () => void;
};

export function ProfileSetupScreen(props: ProfileSetupScreenProps) {
  const {
    sessionMessage, profileSetupName, setProfileSetupName,
    profileSetupSelfie, profileSetupError, setProfileSetupError,
    isPickingSelfie, isSubmittingProfile, onPickSelfie, onSubmit,
  } = props;

  return (
    <>
      {sessionMessage ? <StatusCard {...sessionMessage} /> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Almost there</Text>
        <Text style={styles.sectionBody}>
          Add your name and a photo so people you invite recognise it is really you. Your
          photo is private by default and only shared when you choose.
        </Text>

        <Pressable
          onPress={onPickSelfie}
          disabled={isPickingSelfie}
          style={styles.selfiePickerArea}
        >
          {profileSetupSelfie ? (
            <>
              <Image
                source={{ uri: profileSetupSelfie.uri }}
                style={styles.selfiePreview}
                resizeMode="cover"
              />
              <Text style={[styles.inlineAction, { alignSelf: "center" }]}>
                {isPickingSelfie ? "Opening camera…" : "Retake"}
              </Text>
            </>
          ) : (
            <View style={styles.selfiePlaceholder}>
              <Text style={styles.selfiePlaceholderIcon}>📷</Text>
              <Text style={styles.selfiePickerLabel}>Add a profile photo</Text>
              <Text style={styles.helper}>
                {isPickingSelfie
                  ? "Opening camera…"
                  : "Tap to use your camera · gallery works too"}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            autoCapitalize="words"
            placeholder="How you'll appear in conversations"
            placeholderTextColor="#8ba1a3"
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
          disabled={
            isSubmittingProfile ||
            isPickingSelfie ||
            !profileSetupName.trim() ||
            !profileSetupSelfie
          }
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isSubmittingProfile) && styles.primaryButtonPressed,
            (isSubmittingProfile || !profileSetupName.trim() || !profileSetupSelfie) &&
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
