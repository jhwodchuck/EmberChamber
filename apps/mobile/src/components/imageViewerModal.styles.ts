import { StyleSheet } from "react-native";

// New styles for the gesture-driven full-screen image viewer (Phase 3 slice).
// The existing static viewer chrome (loading / error / close) lives in
// ../styles and is imported read-only; these only cover the zoom/pan/dismiss
// surface layered around the displayed image.
export const imageViewerStyles = StyleSheet.create({
  // Fills the modal so pinch/pan/double-tap/swipe gestures are catchable across
  // the whole screen, not just the letterboxed image bounds.
  gestureRoot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  // Animated black backdrop that fades toward transparent as the image is
  // dragged down to dismiss. Sits behind the image, above the (now transparent)
  // overlay so the letterbox area fades together with the photo.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
});
