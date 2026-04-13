import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles, theme } from "../styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
};

export function ChecklistCreatorSheet({ visible, onClose, onSend }: Props) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState(["", ""]);

  function addItem() {
    setItems((i) => [...i, ""]);
  }

  function updateItem(index: number, value: string) {
    setItems((o) => o.map((item, i) => (i === index ? value : item)));
  }

  function removeItem(index: number) {
    if (items.length > 1) setItems((o) => o.filter((_, i) => i !== index));
  }

  function handleSend() {
    const t = title.trim();
    const checked = items.map((o) => o.trim()).filter(Boolean);
    if (!t || checked.length < 1) return;

    const lines = [
      `☑️ Checklist: "${t}"`,
      "",
      ...checked.map((item) => `☐ ${item}`),
    ];
    onSend(lines.join("\n"));
    setTitle("");
    setItems(["", ""]);
    onClose();
  }

  const canSend = title.trim().length > 0 && items.filter((o) => o.trim()).length >= 1;

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
          <Text style={styles.attachSubSheetTitle}>Create checklist</Text>

          <ScrollView
            style={styles.attachSubSheetScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              style={[styles.input, styles.attachSubSheetInput]}
              autoCorrect
              spellCheck
              placeholder="Title…"
              placeholderTextColor={theme.colors.placeholder}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            {items.map((item, i) => (
              <View key={i} style={styles.attachPollOptionRow}>
                <Text style={styles.attachCheckPrefix}>☐</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  autoCorrect
                  spellCheck
                  placeholder={`Item ${i + 1}…`}
                  placeholderTextColor={theme.colors.placeholder}
                  value={item}
                  onChangeText={(v) => updateItem(i, v)}
                  maxLength={200}
                />
                {items.length > 1 ? (
                  <Pressable style={styles.attachPollRemove} onPress={() => removeItem(i)}>
                    <Text style={styles.attachPollRemoveLabel}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Pressable style={styles.secondaryButton} onPress={addItem}>
              <Text style={styles.secondaryButtonLabel}>+ Add item</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            style={[styles.primaryButton, !canSend ? styles.primaryButtonDisabled : null]}
            onPress={handleSend}
            disabled={!canSend}
          >
            <Text style={styles.primaryButtonLabel}>Send checklist</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
