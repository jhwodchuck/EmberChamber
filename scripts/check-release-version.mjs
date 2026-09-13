#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

function record(label, actual, expected) {
  if (actual !== expected) {
    errors.push(
      `${label} is ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}.`,
    );
  }
}

const expectedVersion = json("package.json").version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(expectedVersion)) {
  errors.push(
    `package.json has invalid release version ${JSON.stringify(expectedVersion)}.`,
  );
}

record(
  "apps/desktop/package.json version",
  json("apps/desktop/package.json").version,
  expectedVersion,
);
record(
  "apps/desktop/src-tauri/tauri.conf.json version",
  json("apps/desktop/src-tauri/tauri.conf.json").version,
  expectedVersion,
);
record(
  "apps/mobile/package.json version",
  json("apps/mobile/package.json").version,
  expectedVersion,
);
record(
  "apps/mobile/app.json Expo version",
  json("apps/mobile/app.json").expo?.version,
  expectedVersion,
);

const cargoVersion = read("Cargo.toml").match(
  /\[workspace\.package\][\s\S]*?^version\s*=\s*"([^"]+)"/m,
)?.[1];
record("Cargo.toml workspace package version", cargoVersion, expectedVersion);

const packageLock = json("package-lock.json");
record("package-lock.json root version", packageLock.version, expectedVersion);
record(
  "package-lock.json root package version",
  packageLock.packages?.[""]?.version,
  expectedVersion,
);
record(
  "package-lock.json desktop package version",
  packageLock.packages?.["apps/desktop"]?.version,
  expectedVersion,
);
record(
  "package-lock.json mobile package version",
  packageLock.packages?.["apps/mobile"]?.version,
  expectedVersion,
);

const cargoLock = read("Cargo.lock");
for (const packageName of [
  "emberchamber-auth",
  "emberchamber-core",
  "emberchamber-db",
  "emberchamber-desktop",
  "emberchamber-domain",
  "emberchamber-relay-protocol",
  "emberchamber-test-support",
]) {
  const version = cargoLock.match(
    new RegExp(`name = "${packageName}"\\r?\\nversion = "([^"]+)"`),
  )?.[1];
  record(`Cargo.lock ${packageName} version`, version, expectedVersion);
}

const refIndex = process.argv.indexOf("--ref");
const releaseRef = refIndex >= 0 ? process.argv[refIndex + 1] : undefined;
if (refIndex >= 0 && !releaseRef) {
  errors.push("--ref requires a value.");
} else if (releaseRef) {
  const tag = releaseRef.startsWith("refs/tags/")
    ? releaseRef.slice("refs/tags/".length)
    : releaseRef;
  if (tag.startsWith("v") && tag !== `v${expectedVersion}`) {
    errors.push(
      `release tag ${tag} does not match manifest version v${expectedVersion}.`,
    );
  }
}

if (errors.length > 0) {
  console.error("Release version check failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Release version check passed (${expectedVersion}).`);
