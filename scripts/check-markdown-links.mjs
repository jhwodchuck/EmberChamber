import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";

const trackedMarkdown = execFileSync("git", ["ls-files", "*.md"], {
  encoding: "utf8",
})
  .split(/\r?\n/u)
  .map((file) => file.trim())
  .filter(Boolean);

if (trackedMarkdown.length === 0) {
  console.log("No tracked Markdown files found.");
  process.exit(0);
}

const executable = path.join(
  process.cwd(),
  "node_modules",
  "markdown-link-check",
  "markdown-link-check",
);

const result = spawnSync(
  process.execPath,
  [executable, "--config", ".markdown-link-check.json", "--quiet", ...trackedMarkdown],
  { stdio: "inherit", shell: false },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
