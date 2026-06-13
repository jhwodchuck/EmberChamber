import {
  Easing,
  ReduceMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from "react-native-reanimated";

// Shared motion vocabulary for the Android polish work. Every Reanimated
// animation in the app should pull its spring/timing from these presets so the
// feel stays consistent as polish spreads across screens (and across the agents
// implementing it). All presets honor the OS "reduce motion" setting.

export const springs = {
  /** Snappy UI response — bubble lift, send-button morph, FAB show/hide. */
  snappy: {
    damping: 18,
    stiffness: 240,
    mass: 0.7,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,
  /** Gentle settle — swipe-to-reply return, sheet entrance. */
  gentle: {
    damping: 22,
    stiffness: 160,
    mass: 0.9,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,
  /** Bouncy accent — reaction pop, badge appear. */
  bouncy: {
    damping: 12,
    stiffness: 320,
    mass: 0.6,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,
} as const;

export const timings = {
  fast: {
    duration: 150,
    easing: Easing.out(Easing.quad),
    reduceMotion: ReduceMotion.System,
  } satisfies WithTimingConfig,
  base: {
    duration: 240,
    easing: Easing.out(Easing.cubic),
    reduceMotion: ReduceMotion.System,
  } satisfies WithTimingConfig,
  slow: {
    duration: 360,
    easing: Easing.inOut(Easing.cubic),
    reduceMotion: ReduceMotion.System,
  } satisfies WithTimingConfig,
} as const;

/** Raw millisecond durations for non-Reanimated timing (setTimeout, layout). */
export const durations = {
  fast: 150,
  base: 240,
  slow: 360,
} as const;
