// Mobile test harness. Uses the version-matched jest-expo preset (SDK 55), which
// pins react-test-renderer to the same React the app uses, so expo-doctor's
// single-React check stays green. Workspace packages and a few CJS/ESM crypto
// deps are added to the transform allowlist so babel can process them.
/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/src/**/*.test.ts", "**/src/**/*.test.tsx"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@emberchamber/.*|tweetnacl|js-sha256))",
  ],
};
