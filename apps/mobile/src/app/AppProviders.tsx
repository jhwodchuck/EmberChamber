import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles";

type AppProvidersProps = {
  showEntryChrome: boolean;
  children: ReactNode;
};

export function AppProviders({
  showEntryChrome,
  children,
}: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.screen}
        edges={["top", "right", "bottom", "left"]}
      >
        {showEntryChrome ? (
          <>
            <View pointerEvents="none" style={styles.backgroundOrbTop} />
            <View pointerEvents="none" style={styles.backgroundOrbLeft} />
            <View pointerEvents="none" style={styles.backgroundOrbRight} />
          </>
        ) : null}
        <KeyboardAvoidingView
          style={styles.keyboardShell}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          enabled={Platform.OS === "ios"}
        >
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
