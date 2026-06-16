import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { FormMessage } from "../types";
import { styles } from "./statusCard.styles";

export function StatusCard({
  tone,
  title,
  body,
  actionLabel,
  onAction,
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
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{title}</Text>
          <Text style={styles.statusBody}>{body}</Text>
        </View>
        {onAction && actionLabel ? (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [styles.statusActionButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.statusActionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
