const { colors, typography, borderRadius } = require("./src/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        obsidian: colors.obsidian,
        ember:    colors.ember,
        glass:    colors.glass,
        error:    colors.error,
        warning:  colors.warning,
        success:  colors.success,
        info:     colors.info,
      },
      fontFamily: typography.fontFamily,
      fontSize:   typography.fontSize,
      borderRadius,
    },
  },
  plugins: [],
};
