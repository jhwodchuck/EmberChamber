import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
  // GestureHandlerRootView must be the outermost host so Reanimated gesture
  // detectors (swipe-to-reply, contextual menu, list swipes) work anywhere in
  // the tree. KeyboardProvider supplies the animated keyboard values that the
  // composer adopts in Phase 3 — it is inert until something subscribes, so the
  // existing iOS-only KeyboardAvoidingView behavior below is preserved for now.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
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
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
