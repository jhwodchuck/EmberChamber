import { colors, radius, spacing, brandShadow, panelShadow, displayFontFamily } from "../theme/theme";
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
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewerCloseButton: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewerCloseText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  imageViewerError: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  imageViewerStatus: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
  },
  imageViewerStatusText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  imageViewerErrorText: {
    color: colors.errorText,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
});
