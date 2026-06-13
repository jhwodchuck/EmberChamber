import { memo, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { conversationScreenStyles } from "../screens/conversationScreen.styles";

const DOT_COUNT = 3;
const DOT_STAGGER_MS = 140;
const DOT_RISE_MS = 360;

// A single dot that loops a staggered opacity + lift so the trio reads as a
// living "typing" pulse. Reduce-motion is honored via the System policy, which
// collapses the repeat into a static resting state on supported platforms.
const TypingDot = memo(function TypingDot({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * DOT_STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: DOT_RISE_MS,
            easing: Easing.out(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0, {
            duration: DOT_RISE_MS,
            easing: Easing.in(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [index, progress]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: -progress.value * 3 }],
  }));

  return <Animated.View style={[conversationScreenStyles.typingDot, dotStyle]} />;
});

export const TypingDots = memo(function TypingDots() {
  return (
    <View style={conversationScreenStyles.typingDots}>
      {Array.from({ length: DOT_COUNT }, (_, index) => (
        <TypingDot key={index} index={index} />
      ))}
    </View>
  );
});
