/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff3ec",
          100: "#ffe1d1",
          200: "#ffc2a2",
          300: "#ffb890",
          400: "#ff996a",
          500: "#ea6f3f",
          600: "#d66034",
          700: "#c85832",
          800: "#853823",
          900: "#61281c",
          950: "#401a14",
        },
        surface: {
          DEFAULT: "rgba(255, 255, 255, 0.04)",
          dark: "#0d0809",
          strong: "rgba(255, 255, 255, 0.06)",
        },
        obsidian: {
          50:  "#fcfbfa",
          100: "#f6d4c5",
          200: "#d7b9ab",
          300: "#b9968f",
          400: "#a7867d",
          500: "#716666",
          600: "#4a3f3f",
          700: "#322626",
          800: "#1a1012",
          900: "#130c0d",
          950: "#0d0809",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 150ms ease-in-out",
        "slide-up": "slideUp 200ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
