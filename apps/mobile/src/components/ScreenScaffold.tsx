import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ScrollView, Text, View } from "react-native";
import { styles } from "../styles";

type ScreenScaffoldProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  headerAction?: ReactNode;
  scrollable?: boolean;
  subtitle: string;
  title: string;
};

export function ScreenScaffold({
  children,
  contentContainerStyle,
  headerAction,
  scrollable = false,
  subtitle,
  title,
}: ScreenScaffoldProps) {
  const header = (
    <View style={styles.screenHeaderRow}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenSubtitle}>{subtitle}</Text>
      </View>
      {headerAction ? (
        <View style={styles.screenHeaderActionSlot}>{headerAction}</View>
      ) : null}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={[
          styles.screenScrollContent,
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {header}
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screenSection}>
      {header}
      {children}
    </View>
  );
}
