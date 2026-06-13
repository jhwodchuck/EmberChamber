import { memo, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../styles";

// Reusable skeleton primitive for loading states. A muted placeholder block is
// overlaid with a single highlight band that sweeps left-to-right on a loop,
// reading as the classic "shimmer" placeholder. The animation is worklet-driven
// (translateX of the band) so it stays on the UI thread, and it collapses to a
// static block when the OS "reduce motion" setting is enabled — matching the
// reduce-motion discipline used elsewhere in the polish work.

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// One full sweep, paced to feel like a calm breathing highlight rather than a
// frantic strobe.
const SWEEP_DURATION_MS = 1200;

// The highlight band is a fraction of the block width; it travels from just off
// the left edge to just off the right edge.
const BAND_WIDTH_RATIO = 0.6;

// Placeholder base + the warmer highlight that rides across it. Both are derived
// from the shared dark palette so skeletons never diverge from the design
// tokens.
const BASE_COLOR = theme.colors.surfaceStrong;
const HIGHLIGHT_EDGE = "rgba(255, 255, 255, 0)";
const HIGHLIGHT_PEAK = "rgba(255, 255, 255, 0.08)";

const HIGHLIGHT_COLORS = [
  HIGHLIGHT_EDGE,
  HIGHLIGHT_PEAK,
  HIGHLIGHT_EDGE,
] as const;

export type ShimmerProps = {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A single rounded shimmer placeholder block. Pass explicit `width`/`height`
 * (numbers, or a percentage string for fluid widths) plus an optional
 * `borderRadius`. Honors OS reduce-motion by rendering a static block.
 */
export const Shimmer = memo(function Shimmer({
  width,
  height,
  borderRadius = 8,
  style,
}: ShimmerProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  // The sweep distance depends on the measured pixel width, which we only know
  // for percentage widths after layout. Numeric widths are known up front.
  const [measuredWidth, setMeasuredWidth] = useState(
    typeof width === "number" ? width : 0,
  );

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    progress.value = withRepeat(
      withTiming(1, {
        duration: SWEEP_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [progress, reduceMotion]);

  const bandWidth = Math.max(measuredWidth * BAND_WIDTH_RATIO, 1);

  const bandStyle = useAnimatedStyle(() => {
    // Travel the band from fully off the left edge to fully off the right edge.
    const start = -bandWidth;
    const end = measuredWidth;
    return {
      transform: [{ translateX: start + (end - start) * progress.value }],
    };
  });

  function handleLayout(event: LayoutChangeEvent) {
    // Only needed for percentage widths; numeric widths already seed the state.
    if (typeof width !== "number") {
      setMeasuredWidth(event.nativeEvent.layout.width);
    }
  }

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.block,
        { width, height, borderRadius, backgroundColor: BASE_COLOR },
        style,
      ]}
    >
      {!reduceMotion && measuredWidth > 0 ? (
        <AnimatedLinearGradient
          colors={HIGHLIGHT_COLORS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.band, { width: bandWidth }, bandStyle]}
        />
      ) : null}
    </View>
  );
});

/**
 * Skeleton placeholder that mirrors the chat-list row layout — a circular
 * avatar plus a title line and a shorter preview line. Used to fill the chat
 * list while the account is still loading.
 */
export const SkeletonChatRow = memo(function SkeletonChatRow() {
  return (
    <View style={styles.row}>
      <Shimmer width={44} height={44} borderRadius={22} />
      <View style={styles.rowCopy}>
        <Shimmer width="62%" height={14} borderRadius={7} />
        <Shimmer width="88%" height={12} borderRadius={6} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    overflow: "hidden",
  },
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  // Mirrors the live chat row: avatar + copy column, same padding and gaps as
  // styles.chatRow so the skeleton occupies the same footprint.
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    padding: 14,
  },
  rowCopy: {
    flex: 1,
    gap: 10,
  },
});
