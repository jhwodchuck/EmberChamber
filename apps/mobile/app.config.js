const fs = require("node:fs");
const path = require("node:path");

const googleServicesRelativePath = "./secrets/google-services.json";
const googleServicesAbsolutePath = path.join(__dirname, "secrets", "google-services.json");

module.exports = ({ config }) => {
  if (!fs.existsSync(googleServicesAbsolutePath)) {
    return config;
  }

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile: googleServicesRelativePath,
    },
  };
};
