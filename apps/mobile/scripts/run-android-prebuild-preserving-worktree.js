const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(appRoot, "android");
const backupRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "emberchamber-android-backup-"),
);
const androidBackup = path.join(backupRoot, "android");
const hadAndroidDirectory = fs.existsSync(androidRoot);

function movePath(source, destination) {
  try {
    fs.renameSync(source, destination);
  } catch (error) {
    if (error && error.code === "EXDEV") {
      fs.cpSync(source, destination, { recursive: true });
      fs.rmSync(source, { recursive: true, force: true });
      return;
    }

    throw error;
  }
}

function runChecked(command, args) {
  const executable = process.platform === "win32" ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: appRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    const error = new Error(
      `${command} ${args.join(" ")} exited with status ${result.status}`,
    );
    error.exitCode = result.status;
    throw error;
  }
}

function cleanupBackupRoot() {
  fs.rmSync(backupRoot, { recursive: true, force: true });
}

let failure = null;

try {
  if (hadAndroidDirectory) {
    movePath(androidRoot, androidBackup);
  }

  runChecked("npm", ["run", "prebuild"]);
} catch (error) {
  failure = error;
}

try {
  if (fs.existsSync(androidRoot)) {
    fs.rmSync(androidRoot, { recursive: true, force: true });
  }

  if (hadAndroidDirectory && fs.existsSync(androidBackup)) {
    movePath(androidBackup, androidRoot);
  }

  cleanupBackupRoot();
} catch (error) {
  if (!failure) {
    failure = error;
  } else {
    console.error("Failed to restore apps/mobile/android after prebuild.");
    console.error(error);
  }
}

if (failure) {
  process.exitCode = failure.exitCode ?? 1;
  throw failure;
}
