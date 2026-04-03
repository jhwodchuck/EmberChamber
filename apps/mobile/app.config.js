const fs = require("node:fs");
const path = require("node:path");

const config = require("./app.json");

const googleServicesRelativePath = "./secrets/google-services.json";
const googleServicesAbsolutePath = path.join(__dirname, "secrets", "google-services.json");

if (fs.existsSync(googleServicesAbsolutePath)) {
  config.expo.android = {
    ...config.expo.android,
    googleServicesFile: googleServicesRelativePath,
  };
}

module.exports = config;
