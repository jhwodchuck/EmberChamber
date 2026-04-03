const fs = require("node:fs");
const path = require("node:path");

const expectedPackageName = "com.emberchamber.mobile";
const filePath = path.join(__dirname, "..", "secrets", "google-services.json");

if (!fs.existsSync(filePath)) {
  console.error(`Missing ${filePath}`);
  console.error("Download google-services.json from Firebase Console and place it in apps/mobile/secrets/.");
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
} catch (error) {
  console.error("Unable to parse google-services.json");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const client = Array.isArray(parsed.client)
  ? parsed.client.find(
      (entry) =>
        entry?.client_info?.android_client_info?.package_name === expectedPackageName,
    )
  : null;

if (!client) {
  console.error(`google-services.json does not contain package ${expectedPackageName}`);
  process.exit(1);
}

const projectInfo = parsed.project_info ?? {};
const appId = client.client_info?.mobilesdk_app_id ?? "unknown";

console.log("google-services.json looks valid for EmberChamber Android.");
console.log(`package: ${expectedPackageName}`);
console.log(`project_id: ${projectInfo.project_id ?? "unknown"}`);
console.log(`project_number: ${projectInfo.project_number ?? "unknown"}`);
console.log(`mobilesdk_app_id: ${appId}`);
