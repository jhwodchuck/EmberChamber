/**
 * patch-android-release-config.js
 *
 * Runs after `expo prebuild` (post-generate) to:
 *   1. Enable R8 full-mode minification + resource shrinking in gradle.properties
 *      so the release AAB is smaller and Play gets a mapping.txt for symbolication.
 *   2. Extend proguard-rules.pro with keep rules for React Native, Expo, Firebase,
 *      New Architecture, OkHttp, and Kotlin coroutines.
 *
 * This script is idempotent: re-running it on an already-patched project is a no-op.
 */

const fs = require("node:fs");
const path = require("node:path");

const androidRoot = path.resolve(__dirname, "..", "android");
const gradlePropsPath = path.join(androidRoot, "gradle.properties");
const proguardRulesPath = path.join(androidRoot, "app", "proguard-rules.pro");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

// ---------------------------------------------------------------------------
// 1. gradle.properties — enable R8 + resource shrinking
// ---------------------------------------------------------------------------

const R8_SENTINEL = "android.enableMinifyInReleaseBuilds";
const R8_BLOCK = `
# R8 full-mode minification — appended by scripts/patch-android-release-config.js
# Produces mapping.txt for Play Console crash symbolication.
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
`;

let gradleProps = readFile(gradlePropsPath);
if (gradleProps.includes(R8_SENTINEL)) {
  console.log("gradle.properties: R8 already enabled, skipping.");
} else {
  writeFile(gradlePropsPath, gradleProps + R8_BLOCK);
  console.log("gradle.properties: Enabled R8 minification and resource shrinking.");
}

// ---------------------------------------------------------------------------
// 2. proguard-rules.pro — add keep rules for RN/Expo ecosystem
// ---------------------------------------------------------------------------

const PROGUARD_SENTINEL = "emberchamber-proguard-rules";
const PROGUARD_BLOCK = `
# ${PROGUARD_SENTINEL} — appended by scripts/patch-android-release-config.js
# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactProp *;
    @com.facebook.react.bridge.ReactPropGroup *;
}
-keep class com.facebook.hermes.unicode.** { *; }
# Expo modules
-keep class expo.modules.** { *; }
-keep class host.exp.** { *; }
# Firebase / FCM
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
# New Architecture / Fabric
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
# Kotlin coroutines
-dontwarn kotlinx.coroutines.**
-keep class kotlinx.coroutines.** { *; }
`;

let proguardRules = readFile(proguardRulesPath);
if (proguardRules.includes(PROGUARD_SENTINEL)) {
  console.log("proguard-rules.pro: keep rules already present, skipping.");
} else {
  writeFile(proguardRulesPath, proguardRules + PROGUARD_BLOCK);
  console.log("proguard-rules.pro: Appended React Native / Expo keep rules.");
}
