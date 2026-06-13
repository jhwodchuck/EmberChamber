import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "../components/GradientBackground";
import { styles } from "../styles";

type AppProvidersProps = {
  showEntryChrome: boolean;
  oledBackground?: boolean;
  children: ReactNode;
};

export function AppProviders({
  children,
  oledBackground = false,
}: AppProvidersProps) {
  // GestureHandlerRootView must be the outermost host so Reanimated gesture
  // detectors (swipe-to-reply, contextual menu, list swipes) work anywhere in
  // the tree. KeyboardProvider supplies the animated keyboard values that the
  // composer adopts in Phase 3 — inert until something subscribes, so the
  // iOS-only KeyboardAvoidingView behavior below is preserved for now.
  // GradientBackground renders the ember backdrop app-wide, behind all content
  // and non-interactive.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <SafeAreaView
            style={styles.screen}
            edges={["top", "right", "bottom", "left"]}
          >
            <GradientBackground oled={oledBackground} />
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
