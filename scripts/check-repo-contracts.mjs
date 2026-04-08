#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function ensure(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function ensureIncludes(relativePath, snippet, label = snippet) {
  ensure(read(relativePath).includes(snippet), `${relativePath} is missing ${label}.`);
}

function ensureExcludes(relativePath, snippet, label = snippet) {
  ensure(!read(relativePath).includes(snippet), `${relativePath} still contains ${label}.`);
}

function parseRepoMap(text) {
  const versionMatch = text.match(/^version:\s*(\d+)/m);
  const version = versionMatch ? Number(versionMatch[1]) : null;
  const entries = [];
  const lines = text.split(/\r?\n/);
  let inPaths = false;
  let current = null;
  let currentListKey = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed === "paths:") {
      inPaths = true;
      current = null;
      currentListKey = null;
      continue;
    }

    if (!inPaths) {
      continue;
    }

    if (line.startsWith("  - path: ")) {
      if (current) {
        entries.push(current);
      }
      current = { path: line.slice("  - path: ".length).trim() };
      currentListKey = null;
      continue;
    }

    if (!current) {
      continue;
    }

    const keyMatch = line.match(/^    ([a-z_]+):\s*(.*)$/);
    if (keyMatch) {
      const [, key, rawValue] = keyMatch;
      if (rawValue === "" || rawValue === "[]") {
        current[key] = [];
        currentListKey = rawValue === "" ? key : null;
      } else {
        current[key] = rawValue;
        currentListKey = null;
      }
      continue;
    }

    const listMatch = line.match(/^      - (.+)$/);
    if (listMatch && currentListKey) {
      current[currentListKey].push(listMatch[1].trim());
    }
  }

  if (current) {
    entries.push(current);
  }

  return { version, entries };
}

const packageJson = JSON.parse(read("package.json"));
ensure(
  typeof packageJson.packageManager === "string" && packageJson.packageManager.startsWith("npm@10"),
  "package.json must keep npm 10 as the canonical root package manager."
);
ensure(packageJson.engines?.node === ">=20 <25", "package.json must keep the Node engine range in sync.");
ensure(packageJson.engines?.npm === ">=10 <11", "package.json must keep the npm engine range in sync.");
ensure(
  packageJson.scripts?.["check:repo-contracts"] === "node scripts/check-repo-contracts.mjs",
  'package.json must expose "check:repo-contracts".'
);
ensure(
  typeof packageJson.scripts?.["verify:all"] === "string" &&
    packageJson.scripts["verify:all"].includes("npm run check:repo-contracts"),
  'package.json "verify:all" must run the repo contract check.'
);

const cargoToml = read("Cargo.toml");
ensure(cargoToml.includes('"services/*"'), 'Cargo.toml must keep "services/*" out of the root workspace.');

const repoMapText = read("repo-map.yaml");
const { version: repoMapVersion, entries: repoMapEntries } = parseRepoMap(repoMapText);
ensure(repoMapVersion === 2, "repo-map.yaml must be on version 2.");

const requiredPaths = [
  "apps/relay",
  "apps/web",
  "apps/mobile",
  "apps/desktop",
  "crates/core",
  "crates/domain",
  "crates/relay-protocol",
  "packages/protocol",
  "docs",
  "scripts",
  ".github/workflows",
  "llm_council",
  "apps/api",
  "infra/docker-compose.yml",
  "services",
];

const repoMapByPath = new Map(repoMapEntries.map((entry) => [entry.path, entry]));
const knownPaths = new Set(repoMapEntries.map((entry) => entry.path));
const validStatuses = new Set(["active", "legacy"]);
const validRisks = new Set(["high", "medium", "low"]);

for (const expectedPath of requiredPaths) {
  ensure(repoMapByPath.has(expectedPath), `repo-map.yaml is missing the ${expectedPath} path entry.`);
}

for (const entry of repoMapEntries) {
  ensure(validStatuses.has(entry.status), `repo-map.yaml entry ${entry.path} has an invalid status.`);
  ensure(typeof entry.purpose === "string" && entry.purpose.length > 0, `repo-map.yaml entry ${entry.path} is missing purpose.`);
  ensure(typeof entry.owner === "string" && entry.owner.length > 0, `repo-map.yaml entry ${entry.path} is missing owner.`);
  ensure(validRisks.has(entry.risk), `repo-map.yaml entry ${entry.path} has an invalid risk.`);
  ensure(Array.isArray(entry.reviewers) && entry.reviewers.length > 0, `repo-map.yaml entry ${entry.path} is missing reviewers.`);
  ensure(Array.isArray(entry.change_routes), `repo-map.yaml entry ${entry.path} is missing change_routes.`);
  ensure(Array.isArray(entry.depends_on), `repo-map.yaml entry ${entry.path} is missing depends_on.`);
  ensure(Array.isArray(entry.verify), `repo-map.yaml entry ${entry.path} is missing verify commands.`);
  if (entry.status === "active") {
    ensure(entry.verify.length > 0, `repo-map.yaml active entry ${entry.path} needs at least one verify command.`);
  }

  ensure(exists(entry.path), `repo-map.yaml points at missing path ${entry.path}.`);

  for (const reviewer of entry.reviewers ?? []) {
    ensure(/^C-\d\d$/.test(reviewer), `repo-map.yaml entry ${entry.path} has invalid reviewer id ${reviewer}.`);
  }

  for (const dependency of entry.depends_on ?? []) {
    ensure(knownPaths.has(dependency), `repo-map.yaml entry ${entry.path} depends on unknown path ${dependency}.`);
  }

  for (const route of entry.change_routes ?? []) {
    ensure(knownPaths.has(route), `repo-map.yaml entry ${entry.path} routes changes to unknown path ${route}.`);
  }
}

ensure(exists("apps/web/src/app/app/new-community/page.tsx"), "apps/web community creation route is missing.");
ensure(exists("apps/web/src/app/app/community/[id]/page.tsx"), "apps/web community detail route is missing.");
ensureIncludes("apps/relay/src/index.ts", '"/v1/communities"', "the relay /v1/communities route.");
ensureIncludes("apps/relay/src/index.ts", "async queue(", "the relay queue consumer.");

ensureIncludes("AGENTS.md", "npm run check:repo-contracts", "`npm run check:repo-contracts` guidance");
ensureIncludes("CONTRIBUTING.md", "npm run check:repo-contracts", "`npm run check:repo-contracts` guidance");
ensureIncludes("docs/README.md", "repo contract and doc/runtime drift checker", "repo contract checker docs");

ensureIncludes("README.md", "/app/new-community", "the community builder route");
ensureIncludes("README.md", "/app/community/[id]", "the community detail route");
ensureIncludes("apps/web/README.md", "/app/new-community", "the community builder route");
ensureIncludes("apps/web/README.md", "/app/community/[id]", "the community detail route");
ensureIncludes("apps/web/README.md", "community and room management", "community and room management guidance");
ensureExcludes("apps/web/README.md", "deferred: community-room", "stale deferred community copy");

ensureIncludes("docs/architecture.md", "Community creation, room creation, restricted-room access, invite freeze policy,", "community runtime capability docs");
ensureIncludes("docs/launch-targets.md", "community and room management", "community launch-target docs");
ensureExcludes("docs/launch-targets.md", "Later-beta community-room flows", "stale later-beta community-room copy");

ensureIncludes("docs/api/relay-http.md", "/v1/communities", "community endpoints");
ensureIncludes("docs/api/relay-http.md", "/v1/communities/:communityId/rooms", "community room endpoints");
ensureIncludes("docs/api/relay-http.md", "/v1/conversations/:conversationId/invites", "conversation invite endpoints");
ensureExcludes("docs/api/relay-http.md", "not yet consumed", "stale PUSH_QUEUE caveat");

if (errors.length > 0) {
  console.error("Repo contract check failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Repo contract check passed.");
