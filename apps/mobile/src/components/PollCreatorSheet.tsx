import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles, theme } from "../styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
};

export function PollCreatorSheet({ visible, onClose, onSend }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function addOption() {
    if (options.length < 10) setOptions((o) => [...o, ""]);
  }

  function updateOption(index: number, value: string) {
    setOptions((o) => o.map((item, i) => (i === index ? value : item)));
  }

  function removeOption(index: number) {
    if (options.length > 2) setOptions((o) => o.filter((_, i) => i !== index));
  }

  function handleSend() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;

    const lines = [
      `📊 Poll: "${q}"`,
      "",
      ...opts.map((o, i) => `${i + 1}. ${o}`),
    ];
    onSend(lines.join("\n"));
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  }

  const canSend = question.trim().length > 0 && options.filter((o) => o.trim()).length >= 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.contextMenuOverlay} onPress={onClose}>
        <Pressable style={styles.attachSubSheet}>
          <View style={styles.contextMenuDrag} />
          <Text style={styles.attachSubSheetTitle}>Create poll</Text>

          <ScrollView
            style={styles.attachSubSheetScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              style={[styles.input, styles.attachSubSheetInput]}
              autoCorrect
              spellCheck
              placeholder="Question…"
              placeholderTextColor={theme.colors.placeholder}
              value={question}
              onChangeText={setQuestion}
              maxLength={200}
            />

            {options.map((opt, i) => (
              <View key={i} style={styles.attachPollOptionRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  autoCorrect
                  spellCheck
                  placeholder={`Option ${i + 1}…`}
                  placeholderTextColor={theme.colors.placeholder}
                  value={opt}
                  onChangeText={(v) => updateOption(i, v)}
                  maxLength={100}
                />
                {options.length > 2 ? (
                  <Pressable style={styles.attachPollRemove} onPress={() => removeOption(i)}>
                    <Text style={styles.attachPollRemoveLabel}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            {options.length < 10 ? (
              <Pressable style={styles.secondaryButton} onPress={addOption}>
                <Text style={styles.secondaryButtonLabel}>+ Add option</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <Pressable
            style={[styles.primaryButton, !canSend ? styles.primaryButtonDisabled : null]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Text style={styles.primaryButtonLabel}>Send poll</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
