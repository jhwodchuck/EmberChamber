import * as Haptics from "expo-haptics";

// Centralized haptic vocabulary so every interaction across the app speaks the
// same physical language. All calls are fire-and-forget and swallow errors:
// haptics are best-effort and silently unavailable on some devices and on the
// emulator, so callers should never have to guard them.

function fireAndForget(run: () => Promise<unknown>) {
  void run().catch(() => undefined);
}

export const haptics = {
  /** Light selection tick — filter changes, swipe threshold crossings. */
  selection() {
    fireAndForget(() => Haptics.selectionAsync());
  },
  /** Light impact — subtle confirmations, reaction taps. */
  light() {
    fireAndForget(() =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    );
  },
  /** Medium impact — message send, opening the contextual menu. */
  medium() {
    fireAndForget(() =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    );
  },
  /** Heavy impact — destructive thresholds, long-press grab. */
  heavy() {
    fireAndForget(() =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    );
  },
  /** Success notification — completed send/delivery, accepted invite. */
  success() {
    fireAndForget(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    );
  },
  /** Warning notification — recoverable problems. */
  warning() {
    fireAndForget(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    );
  },
  /** Error notification — failed sends, rejected actions. */
  error() {
    fireAndForget(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    );
  },
};
