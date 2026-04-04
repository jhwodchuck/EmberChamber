import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { decryptAttachmentBytes } from "@emberchamber/protocol";
import type { GroupThreadMessage } from "../types";
import { styles, theme } from "../styles";

type Attachment = NonNullable<GroupThreadMessage["attachment"]>;

type ImageViewerModalProps = {
  attachment: Attachment | null;
  /** Pre-built object URL (already decrypted, e.g. from a local file). */
  plainUri?: string | null;
  visible: boolean;
  onClose: () => void;
};

export function ImageViewerModal({
  attachment,
  plainUri,
  visible,
  onClose,
}: ImageViewerModalProps) {
  const [uri, setUri] = useState<string | null>(plainUri ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (plainUri) {
      setUri(plainUri);
      return;
    }
    if (!attachment) return;

    if (attachment.encryptionMode !== "device_encrypted") {
      setUri(attachment.downloadUrl ?? null);
      return;
    }

    // device_encrypted: fetch + decrypt
    const url = attachment.downloadUrl;
    if (!url || !attachment.fileKeyB64 || !attachment.fileIvB64) {
      setError("Attachment keys are missing – cannot decrypt.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setUri(null);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to download encrypted attachment.");
        const ciphertext = await res.arrayBuffer();
        const plain = decryptAttachmentBytes(
          ciphertext,
          attachment.fileKeyB64!,
          attachment.fileIvB64!,
        );
        if (cancelled) return;
        // Build a data URL so we don't need a file-system write
        const base64 = uint8ToBase64(plain);
        setUri(`data:${attachment.mimeType};base64,${base64}`);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Decryption failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, attachment, plainUri]);

  const { width, height } = Dimensions.get("window");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.imageViewerOverlay}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.textSoft} />
        ) : error ? (
          <View style={styles.imageViewerError}>
            <Text style={styles.imageViewerErrorText}>{error}</Text>
            <Pressable onPress={onClose} style={[styles.secondaryButton, { marginTop: 16 }]}>
              <Text style={styles.secondaryButtonLabel}>Close</Text>
            </Pressable>
          </View>
        ) : uri ? (
          <Image
            source={{ uri }}
            style={{ width, height, resizeMode: "contain" }}
          />
        ) : null}

        <Pressable onPress={onClose} style={styles.imageViewerCloseButton}>
          <Text style={styles.imageViewerCloseText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ----- helpers -----

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
