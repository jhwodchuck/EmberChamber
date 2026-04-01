/**
 * EmberChamber design tokens.
 *
 * Visual direction: graphite/ivory base, teal signal colour, restrained motion,
 * dense but calm layouts, editorial display font for headers, neutral sans for UI.
 */

// ─── Colour palette ──────────────────────────────────────────────────────────

export const colors = {
  // Neutrals — graphite/ivory base
  graphite: {
    50:  "#f7f7f8",
    100: "#eeeef0",
    200: "#d9d9de",
    300: "#b8b8c2",
    400: "#9292a0",
    500: "#717181",
    600: "#5a5a6a",
    700: "#474756",
    800: "#3a3a47",
    900: "#2e2e3a",
    950: "#1a1a24",
  },

  ivory: {
    50:  "#fdfcfb",
    100: "#f9f7f4",
    200: "#f2ede8",
    300: "#e8e0d8",
  },

  // Signal — teal accent
  teal: {
    50:  "#effcf9",
    100: "#d0f5ed",
    200: "#a4ebdc",
    300: "#6ddac6",
    400: "#3bc2ab",
    500: "#1fa890",  // primary signal colour
    600: "#178776",
    700: "#166b5e",
    800: "#15544b",
    900: "#12433c",
    950: "#082924",
  },

  // Semantic
  error:   { light: "#fef2f2", DEFAULT: "#dc2626", dark: "#991b1b" },
  warning: { light: "#fffbeb", DEFAULT: "#d97706", dark: "#92400e" },
  success: { light: "#f0fdf4", DEFAULT: "#16a34a", dark: "#14532d" },
  info:    { light: "#eff6ff", DEFAULT: "#2563eb", dark: "#1e3a8a" },
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    display: ["'Playfair Display'", "Georgia", "serif"],
    sans:    ["'Inter'", "system-ui", "sans-serif"],
    mono:    ["'JetBrains Mono'", "'Fira Code'", "monospace"],
  },
  fontSize: {
    xs:   ["0.75rem",  { lineHeight: "1rem" }],
    sm:   ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem",     { lineHeight: "1.5rem" }],
    lg:   ["1.125rem", { lineHeight: "1.75rem" }],
    xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
    "2xl":["1.5rem",   { lineHeight: "2rem" }],
    "3xl":["1.875rem", { lineHeight: "2.25rem" }],
    "4xl":["2.25rem",  { lineHeight: "2.5rem" }],
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  px:  "1px",
  0:   "0px",
  0.5: "0.125rem",
  1:   "0.25rem",
  1.5: "0.375rem",
  2:   "0.5rem",
  2.5: "0.625rem",
  3:   "0.75rem",
  3.5: "0.875rem",
  4:   "1rem",
  5:   "1.25rem",
  6:   "1.5rem",
  7:   "1.75rem",
  8:   "2rem",
  10:  "2.5rem",
  12:  "3rem",
  16:  "4rem",
  20:  "5rem",
  24:  "6rem",
  32:  "8rem",
} as const;

// ─── Motion ──────────────────────────────────────────────────────────────────

export const animation = {
  // Restrained motion — honour prefers-reduced-motion
  duration: {
    fast:   "100ms",
    base:   "150ms",
    slow:   "250ms",
    slower: "400ms",
  },
  easing: {
    base:    "cubic-bezier(0.4, 0, 0.2, 1)",
    in:      "cubic-bezier(0.4, 0, 1, 1)",
    out:     "cubic-bezier(0, 0, 0.2, 1)",
    spring:  "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const borderRadius = {
  none:  "0px",
  sm:    "0.125rem",
  base:  "0.25rem",
  md:    "0.375rem",
  lg:    "0.5rem",
  xl:    "0.75rem",
  "2xl": "1rem",
  full:  "9999px",
} as const;

// ─── Z-index scale ────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  10,
  overlay: 20,
  modal:   30,
  toast:   40,
  tooltip: 50,
} as const;

// ─── Trust state colours ─────────────────────────────────────────────────────
// Clear visual separation between secure DM and hosted community trust states.

export const trustState = {
  /** Used for E2EE DM surfaces. */
  secure: {
    badge:      colors.teal[500],
    badgeBg:    colors.teal[50],
    border:     colors.teal[200],
  },
  /** Used for hosted group/channel surfaces. */
  hosted: {
    badge:      colors.graphite[500],
    badgeBg:    colors.graphite[100],
    border:     colors.graphite[200],
  },
} as const;
