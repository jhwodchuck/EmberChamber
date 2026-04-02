const fs = require("fs");
const path = require("path");

const pluginSettingsPath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "node_modules",
  "@react-native",
  "gradle-plugin",
  "settings.gradle.kts",
);

const before = 'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }';
const after = 'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }';

if (!fs.existsSync(pluginSettingsPath)) {
  throw new Error(`React Native gradle plugin settings not found at ${pluginSettingsPath}`);
}

const current = fs.readFileSync(pluginSettingsPath, "utf8");
if (current.includes(after)) {
  process.exit(0);
}

if (!current.includes(before)) {
  throw new Error("Unexpected React Native gradle plugin settings file contents.");
}

fs.writeFileSync(pluginSettingsPath, current.replace(before, after));
