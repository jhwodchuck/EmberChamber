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
import type { GroupThreadMessage } from "../types";
import { styles, theme } from "../styles";
import { useAttachmentManager } from "../hooks/useAttachmentManager";

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
  const {
    attemptCount,
    canRetry,
    error,
    isBusy,
    prepareForPreview,
    reset,
    retry,
    status,
    statusLabel,
  } = useAttachmentManager(attachment);

  useEffect(() => {
    if (!visible) {
      reset();
      return;
    }

    if (plainUri) {
      setUri(plainUri);
      return;
    }
    setUri(null);
    if (!attachment) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextUri = await prepareForPreview();
      if (!cancelled) {
        setUri(nextUri);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attachment, plainUri, prepareForPreview, reset, visible]);

  const { width, height } = Dimensions.get("window");
  const loading = !plainUri && isBusy;
  const errorText = plainUri ? null : error;

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
          <View style={styles.imageViewerStatus}>
            <ActivityIndicator size="large" color={theme.colors.textSoft} />
            <Text style={styles.imageViewerStatusText}>
              {statusLabel || "Loading attachment…"}
            </Text>
          </View>
        ) : errorText ? (
          <View style={styles.imageViewerError}>
            <Text style={styles.imageViewerErrorText}>{errorText}</Text>
            {canRetry ? (
              <Pressable
                onPress={() => void retry()}
                style={[styles.primaryButton, { marginTop: 16 }]}
              >
                <Text style={styles.primaryButtonLabel}>
                  Retry{attemptCount > 1 ? ` (${attemptCount})` : ""}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              style={[styles.secondaryButton, { marginTop: 12 }]}
            >
              <Text style={styles.secondaryButtonLabel}>Close</Text>
            </Pressable>
          </View>
        ) : uri ? (
          <Image
            source={{ uri }}
            style={{ width, height, resizeMode: "contain" }}
          />
        ) : status !== "idle" && statusLabel ? (
          <View style={styles.imageViewerStatus}>
            <Text style={styles.imageViewerStatusText}>{statusLabel}</Text>
          </View>
        ) : null}

        <Pressable onPress={onClose} style={styles.imageViewerCloseButton}>
          <Text style={styles.imageViewerCloseText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
