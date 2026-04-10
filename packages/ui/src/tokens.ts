/**
 * EmberChamber design tokens.
 *
 * Visual direction: deep obsidian/graphite dark mode base, vibrant ember orange accent,
 * restrained motion, glassmorphism surface layering, dense but calm layouts,
 * modern digital-first typography for headers, neutral sans for UI.
 */

// ─── Colour palette ──────────────────────────────────────────────────────────

export const colors = {
  // Brand — Ember Orange
  ember: {
    50: "#fff3ec",
    100: "#ffe1d1",
    200: "#ffc2a2",
    300: "#ffb890", // Light accent
    400: "#ff996a",
    500: "#ea6f3f", // Core Primary
    600: "#d66034", // Pressed Primary
    700: "#c85832",
    800: "#853823",
    900: "#61281c",
    950: "#401a14",
  },

  // Obsidian Neutrals for true premium dark aesthetic
  obsidian: {
    50: "#fcfbfa",
    100: "#f6d4c5", // Soft text
    200: "#d7b9ab", // Muted text
    300: "#b9968f", // Placeholder
    400: "#a7867d",
    500: "#716666",
    600: "#4a3f3f",
    700: "#322626", // Border
    800: "#1a1012", // Panel Strong
    900: "#130c0d", // Panel / Surface
    950: "#0d0809", // App Background
  },

  // Glass/Overlay Variables
  glass: {
    surfaceStrong: "rgba(255, 255, 255, 0.06)",
    surface: "rgba(255, 255, 255, 0.04)",
    surfaceSubtle: "rgba(255, 255, 255, 0.02)",
    borderStrong: "rgba(255, 184, 144, 0.2)",
    border: "rgba(255, 255, 255, 0.09)",
  },

  // Semantic Colors
  error: {
    border: "rgba(253, 164, 175, 0.36)",
    background: "rgba(82, 23, 23, 0.44)",
    text: "#fecdd3",
  },
  warning: {
    border: "rgba(255, 210, 139, 0.36)",
    background: "rgba(82, 56, 21, 0.44)",
    text: "#ffd28b",
  },
  success: {
    border: "rgba(124, 230, 191, 0.34)",
    background: "rgba(21, 67, 50, 0.44)",
    text: "#98efc5",
  },
  info: {
    border: "rgba(164, 212, 253, 0.36)",
    background: "rgba(23, 44, 82, 0.44)",
    text: "#cddbfe",
  },
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  glass: "0 28px 70px rgba(0, 0, 0, 0.34)",
  glowEmber: "0 16px 38px rgba(234, 111, 63, 0.28)",
  inset: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    display: ["Georgia", "'Times New Roman'", "serif"],
    sans: ["'Inter'", "system-ui", "sans-serif"],
    mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
    "5xl": ["3rem", { lineHeight: "1" }],
    "6xl": ["3.75rem", { lineHeight: "1" }],
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  px: "1px",
  0: "0px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
} as const;

// ─── Motion ──────────────────────────────────────────────────────────────────

export const animation = {
  // Premium motion with physical weight
  duration: {
    fast: "120ms",
    base: "200ms",
    slow: "350ms",
    slower: "500ms",
  },
  easing: {
    default: "cubic-bezier(0.16, 1, 0.3, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // Bouncy
  },
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const borderRadius = {
  none: "0px",
  sm: "0.25rem", // 4px
  base: "0.375rem", // 6px
  md: "0.625rem", // 10px
  lg: "0.875rem", // 14px
  xl: "1.125rem", // 18px
  "2xl": "1.5rem", // 24px
  "3xl": "1.75rem", // 28px
  full: "9999px",
} as const;

// ─── Z-index scale ────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  raised: 10,
  overlay: 20,
  modal: 30,
  toast: 40,
  tooltip: 50,
} as const;

// ─── Trust state colours ─────────────────────────────────────────────────────

export const trustState = {
  /** Used for E2EE DM surfaces. */
  secure: {
    badge: colors.success.text,
    badgeBg: colors.success.background,
    border: colors.success.border,
  },
  /** Used for hosted group/channel surfaces. */
  hosted: {
    badge: colors.obsidian[200],
    badgeBg: colors.obsidian[800],
    border: colors.obsidian[700],
  },
} as const;
