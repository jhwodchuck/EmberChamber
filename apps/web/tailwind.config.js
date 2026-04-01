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
          300: "#ff996a",
          400: "#f27747",
          500: "#c85832",
          600: "#a94729",
          700: "#853823",
          800: "#61281c",
          900: "#401a14",
          950: "#210e0b",
        },
        surface: {
          DEFAULT: "#fffdf9",
          dark: "#140d0e",
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
