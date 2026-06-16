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
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { GroupThreadMessage } from "../types";
import { styles as sharedStyles, theme } from "../styles";
import { useAttachmentManager } from "../hooks/useAttachmentManager";
import { haptics } from "../lib/haptics";
import { springs } from "../lib/motion";
import { imageViewerStyles as modalStyles } from "./imageViewerModal.styles";

const styles = { ...sharedStyles, ...modalStyles };

type Attachment = NonNullable<GroupThreadMessage["attachment"]>;

// Zoom + dismiss tuning. Kept here so the gesture math reads top-to-bottom.
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_TRANSLATION = 140; // px of downward drag that triggers onClose
const DISMISS_VELOCITY = 1000; // fast downward fling also dismisses

const AnimatedImage = Animated.createAnimatedComponent(Image);

type ZoomableImageProps = {
  uri: string;
  width: number;
  height: number;
  onClose: () => void;
};

/**
 * Telegram/Signal-style gesture surface around a single full-screen image:
 * pinch-to-zoom (clamped, springs back below 1x), pan while zoomed,
 * double-tap to toggle ~2.5x centered on the tap, and swipe-down-to-dismiss
 * when not zoomed with the backdrop fading as it drags. All animation is
 * Reanimated v4 running on the UI thread; onClose is hopped back to JS via
 * runOnJS.
 */
function ZoomableImage({ uri, width, height, onClose }: ZoomableImageProps) {
  // Committed zoom/pan state (persists between gestures).
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pinch focal point so zoom grows from where the fingers are.
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Vertical drag used purely for swipe-to-dismiss (only when not zoomed).
  const dismissTranslateY = useSharedValue(0);
  // Latches so the threshold-cross haptic fires exactly once per drag.
  const dismissArmed = useSharedValue(false);

  const reset = () => {
    "worklet";
    scale.value = withSpring(MIN_SCALE, springs.gentle);
    savedScale.value = MIN_SCALE;
    translateX.value = withSpring(0, springs.gentle);
    translateY.value = withSpring(0, springs.gentle);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      focalX.value = event.focalX - width / 2;
      focalY.value = event.focalY - height / 2;
    })
    .onUpdate((event) => {
      const next = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(next, MIN_SCALE * 0.85), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        // Released below threshold — settle back to 1x and recenter.
        scale.value = withSpring(MIN_SCALE, springs.gentle);
        savedScale.value = MIN_SCALE;
        translateX.value = withSpring(0, springs.gentle);
        translateY.value = withSpring(0, springs.gentle);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const clamped = Math.min(scale.value, MAX_SCALE);
        scale.value = withSpring(clamped, springs.gentle);
        savedScale.value = clamped;
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > MIN_SCALE) {
        // Zoomed: pan moves the image within the frame.
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      } else if (event.translationY > 0) {
        // Not zoomed and dragging down: swipe-to-dismiss.
        dismissTranslateY.value = event.translationY;
        const crossed = event.translationY > DISMISS_TRANSLATION;
        if (crossed && !dismissArmed.value) {
          dismissArmed.value = true;
          runOnJS(haptics.light)();
        } else if (!crossed && dismissArmed.value) {
          dismissArmed.value = false;
        }
      }
    })
    .onEnd((event) => {
      if (scale.value > MIN_SCALE) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        return;
      }
      const shouldDismiss =
        event.translationY > DISMISS_TRANSLATION ||
        event.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        runOnJS(onClose)();
      } else {
        dismissTranslateY.value = withSpring(0, springs.gentle);
      }
      dismissArmed.value = false;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > MIN_SCALE) {
        reset();
      } else {
        // Zoom in centered on the tap point.
        const targetScale = DOUBLE_TAP_SCALE;
        const tapX = event.x - width / 2;
        const tapY = event.y - height / 2;
        scale.value = withSpring(targetScale, springs.gentle);
        savedScale.value = targetScale;
        const nextX = -tapX * (targetScale - 1);
        const nextY = -tapY * (targetScale - 1);
        translateX.value = withSpring(nextX, springs.gentle);
        translateY.value = withSpring(nextY, springs.gentle);
        savedTranslateX.value = nextX;
        savedTranslateY.value = nextY;
      }
    });

  // Pinch + pan run together; double-tap arbitrates as a discrete tap.
  const composed = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, pan),
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + dismissTranslateY.value },
      { translateX: focalX.value },
      { translateY: focalY.value },
      { scale: scale.value },
      { translateX: -focalX.value },
      { translateY: -focalY.value },
    ],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => {
    // Fade the black backdrop toward transparent as the image drags away.
    const progress = Math.min(
      Math.abs(dismissTranslateY.value) / (DISMISS_TRANSLATION * 2),
      1,
    );
    return { opacity: 0.96 * (1 - progress) };
  });

  return (
    <View style={styles.gestureRoot}>
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, animatedBackdropStyle]}
      />
      <GestureDetector gesture={composed}>
        <AnimatedImage
          source={{ uri }}
          style={[
            { width, height, resizeMode: "contain" },
            animatedImageStyle,
          ]}
        />
      </GestureDetector>
    </View>
  );
}

type ImageViewerModalProps = {
  attachment: Attachment | null;
  /** Pre-built object URL (already decrypted, e.g. from a local file). */
  plainUri?: string | null;
  resolveAttachmentAccess?: () => Promise<Attachment | null>;
  visible: boolean;
  onClose: () => void;
};

export function ImageViewerModal({
  attachment,
  plainUri,
  resolveAttachmentAccess,
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
  } = useAttachmentManager(attachment, resolveAttachmentAccess);

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
  // When the image itself is on screen, the animated backdrop inside
  // ZoomableImage owns the black so it can fade during swipe-to-dismiss, so the
  // static overlay background is dropped to transparent. Every other branch
  // (loading / error / status) keeps the original opaque overlay.
  const showingImage = !loading && !errorText && !!uri;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View
        style={[
          styles.imageViewerOverlay,
          showingImage ? { backgroundColor: "transparent" } : null,
        ]}
      >
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
          <ZoomableImage
            uri={uri}
            width={width}
            height={height}
            onClose={onClose}
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
