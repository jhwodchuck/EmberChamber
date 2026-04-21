import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import type { OnboardingScreenProps } from "../screens/OnboardingScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import type { ProfileSetupScreenProps } from "../screens/ProfileSetupScreen";
import { ProfileSetupScreen } from "../screens/ProfileSetupScreen";
import { MainScreen, type MainScreenProps } from "../screens/MainScreen";
import { styles, theme } from "../styles";

type AppShellProps = {
  showEntryChrome: boolean;
  isMainShellReady: boolean;
  isSignedIn: boolean;
  heroSignals: readonly string[];
  trustBoundaryItems: readonly string[];
  onboardingProps: OnboardingScreenProps;
  profileSetupProps: ProfileSetupScreenProps;
  mainScreenProps: MainScreenProps;
};

export function AppShell({
  showEntryChrome,
  isMainShellReady,
  isSignedIn,
  heroSignals,
  trustBoundaryItems,
  onboardingProps,
  profileSetupProps,
  mainScreenProps,
}: AppShellProps) {
  if (showEntryChrome) {
    return (
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>EC</Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.eyebrow}>
                {!isSignedIn ? "Android beta" : "Profile setup"}
              </Text>
              <Text style={styles.brandName}>EmberChamber</Text>
            </View>
          </View>
          <Text style={styles.title}>
            {!isSignedIn
              ? "Get this phone into your chats fast"
              : "Choose the name your circles will see"}
          </Text>
          <Text style={styles.subtitle}>
            {!isSignedIn
              ? "Keep onboarding focused on the next action only: name this phone, confirm adults-only access, and finish sign-in from your inbox or a trusted device."
              : "Pick the display name that should appear in trusted-circle conversations on this device."}
          </Text>
          {!isSignedIn ? (
            <View style={styles.heroSignalRow}>
              {heroSignals.map((signal) => (
                <View key={signal} style={styles.heroSignalChip}>
                  <Text style={styles.heroSignalText}>{signal}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {!isSignedIn ? (
          <OnboardingScreen {...onboardingProps} />
        ) : (
          <ProfileSetupScreen {...profileSetupProps} />
        )}

        {!isSignedIn ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trust boundary</Text>
            {trustBoundaryItems.map((item) => (
              <Text key={item} style={styles.bullet}>
                • {item}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  if (!isMainShellReady) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="small" color={theme.colors.textSoft} />
        <Text style={styles.emptyStateTitle}>Restoring workspace</Text>
        <Text style={styles.emptyStateBody}>
          Loading your last section and conversation on this device.
        </Text>
      </View>
    );
  }

  return <MainScreen {...mainScreenProps} />;
}
