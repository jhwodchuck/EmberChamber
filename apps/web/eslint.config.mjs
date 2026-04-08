import tsParser from "@typescript-eslint/parser";
import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  { files: ["**/*.{js,jsx,ts,tsx}"] },
  { ignores: [".next/**", "node_modules/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  nextPlugin.flatConfig.recommended,
  nextPlugin.flatConfig.coreWebVitals,
];

export default eslintConfig;
