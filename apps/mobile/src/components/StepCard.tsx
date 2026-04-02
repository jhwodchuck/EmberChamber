import { Text, View } from "react-native";
import { styles } from "../styles";

export function StepCard({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <View style={styles.stepCard}>
      <Text style={styles.stepNumber}>{number}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  );
}
