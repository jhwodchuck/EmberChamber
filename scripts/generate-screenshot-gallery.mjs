#!/usr/bin/env node
/**
 * generate-screenshot-gallery.mjs
 *
 * Reads the screenshot PNGs already staged under
 * docs/wiki-site/public/screenshots/ and generates
 * docs/wiki-site/screenshots.md with an inline responsive grid.
 *
 * Called by .github/workflows/publish-screenshots.yml after artifact
 * downloads complete. Safe to run locally too.
 */

import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO = process.env.GITHUB_REPOSITORY ?? "jhwodchuck/EmberChamber";
const SCREENSHOTS_PUBLIC = "docs/wiki-site/public/screenshots";
const OUT_PAGE = "docs/wiki-site/screenshots.md";

const SECTIONS = [
  {
    dir: "android/phone",
    title: "Android · Phone",
    note: "Pixel 6 · 1080 × 2400 · portrait",
  },
  {
    dir: "android/tablet",
    title: "Android · Tablet",
    note: "Pixel Tablet · 1600 × 2560 · portrait",
  },
  {
    dir: "android/chromebook",
    title: "Android · Chromebook",
    note: "Pixel C · 1366 × 768 · landscape",
  },
  {
    dir: "android/auto",
    title: "Android Auto",
    note: "Automotive 1024p · 1024 × 768 · landscape · Car App Library messaging UI",
  },
  {
    dir: "web",
    title: "Web companion",
    note: "New-user auth flow · Playwright + Chromium",
  },
  {
    dir: "desktop",
    title: "Desktop shell",
    note: "Tauri shell HTML · Playwright Chromium",
  },
];

function listPngs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort();
}

const galleryWorkflowUrl = `https://github.com/${REPO}/actions/workflows/publish-screenshots.yml`;

let md =
  `# Screenshot Gallery\n\n` +
  `Screenshots are captured automatically from CI on every successful build ` +
  `and published here by the ` +
  `[Publish Screenshot Gallery](${galleryWorkflowUrl}) workflow.\n\n`;

let anySections = false;

for (const { dir, title, note } of SECTIONS) {
  const files = listPngs(join(SCREENSHOTS_PUBLIC, dir));
  if (files.length === 0) continue;
  anySections = true;

  md += `## ${title}\n\n_${note}_\n\n`;
  md +=
    `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));` +
    `gap:12px;margin:1.5rem 0">\n\n`;

  for (const f of files) {
    const label = f.replace(".png", "").replace(/-/g, " ");
    const alt = `${title} — ${label}`;
    md +=
      `<img src="/screenshots/${dir}/${f}" alt="${alt}" loading="lazy" ` +
      `style="width:100%;border-radius:6px;border:1px solid var(--vp-c-divider)">\n\n`;
  }

  md += `</div>\n\n`;
}

if (!anySections) {
  md +=
    `> Screenshots have not been published yet. They will appear here after ` +
    `the first successful run of the CI workflows on \`main\`.\n`;
}

writeFileSync(OUT_PAGE, md, "utf8");
console.log(
  `Generated ${OUT_PAGE}` +
    (anySections ? ` with ${SECTIONS.filter((s) => listPngs(join(SCREENSHOTS_PUBLIC, s.dir)).length > 0).length} sections.` : " (placeholder — no screenshots staged yet).")
);
