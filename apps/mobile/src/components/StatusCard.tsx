import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { FormMessage } from "../types";
import { styles } from "../styles";

export function StatusCard({
  tone,
  title,
  body,
  children,
}: FormMessage & { children?: ReactNode }) {
  return (
    <View
      style={[
        styles.statusCard,
        tone === "warning" && styles.statusCardWarning,
        tone === "error" && styles.statusCardError,
        tone === "success" && styles.statusCardSuccess,
      ]}
    >
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusBody}>{body}</Text>
      {children}
    </View>
  );
}
