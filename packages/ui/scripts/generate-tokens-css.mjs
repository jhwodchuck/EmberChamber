/**
 * Generates dist/tokens.css from the compiled token exports.
 *
 * Variable names match the canonical set used in apps/web/src/app/globals.css
 * so the desktop shell (and any future surface) can <link> this file instead
 * of maintaining private copies.
 *
 * Run automatically as part of `npm run build --workspace=packages/ui`.
 */

import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const {
  colors,
  colorRoles,
  colorRolesLight,
  trustState,
  animation,
  borderRadius,
  zIndex,
  iconSizes,
} = require("../dist/tokens.js");

const lines = ["/* EmberChamber canonical design tokens — generated, do not edit. */", ":root {"];

// ── Ember colour ramp ─────────────────────────────────────────────────────
for (const [step, value] of Object.entries(colors.ember)) {
  lines.push(`  --ember-${step}: ${value};`);
}

// ── Obsidian colour ramp ──────────────────────────────────────────────────
for (const [step, value] of Object.entries(colors.obsidian)) {
  lines.push(`  --obsidian-${step}: ${value};`);
}

// ── Glass fills ───────────────────────────────────────────────────────────
lines.push(`  --glass-surface-strong: ${colors.glass.surfaceStrong};`);
lines.push(`  --glass-surface: ${colors.glass.surface};`);
lines.push(`  --glass-surface-subtle: ${colors.glass.surfaceSubtle};`);
lines.push(`  --glass-border-strong: ${colors.glass.borderStrong};`);
lines.push(`  --glass-border: ${colors.glass.border};`);

// ── Status colours ────────────────────────────────────────────────────────
lines.push(`  --success-text: ${colors.success.text};`);
lines.push(`  --success-bg: ${colors.success.background};`);
lines.push(`  --success-border: ${colors.success.border};`);
lines.push(`  --warning-text: ${colors.warning.text};`);
lines.push(`  --warning-bg: ${colors.warning.background};`);
lines.push(`  --warning-border: ${colors.warning.border};`);
lines.push(`  --error-text: ${colors.error.text};`);
lines.push(`  --error-bg: ${colors.error.background};`);
lines.push(`  --error-border: ${colors.error.border};`);
lines.push(`  --info-text: ${colors.info.text};`);
lines.push(`  --info-bg: ${colors.info.background};`);
lines.push(`  --info-border: ${colors.info.border};`);

// ── Brand roles (theme-independent) ──────────────────────────────────────
lines.push(`  --brand: ${colorRoles.brandPrimary};`);
lines.push(`  --brand-pressed: ${colorRoles.brandPrimaryPressed};`);
lines.push(`  --brand-soft: ${colorRoles.brandSoft};`);
lines.push(`  --brand-muted: ${colorRoles.brandMuted};`);
lines.push(`  --on-brand: #ffffff;`);

// ── Trust state (constant across themes) ─────────────────────────────────
lines.push(`  --trust-secure-text: var(--success-text);`);
lines.push(`  --trust-secure-bg: var(--success-bg);`);
lines.push(`  --trust-secure-border: var(--success-border);`);

// ── Border radii ──────────────────────────────────────────────────────────
for (const [name, value] of Object.entries(borderRadius)) {
  if (name === "none") continue;
  lines.push(`  --radius-${name}: ${value};`);
}

// ── Motion ────────────────────────────────────────────────────────────────
for (const [name, value] of Object.entries(animation.duration)) {
  lines.push(`  --dur-${name}: ${value};`);
}
lines.push(`  --ease-default: ${animation.easing.default};`);
lines.push(`  --ease-in: ${animation.easing.in};`);
lines.push(`  --ease-out: ${animation.easing.out};`);
lines.push(`  --ease-spring: ${animation.easing.spring};`);

// ── Z-index ───────────────────────────────────────────────────────────────
for (const [name, value] of Object.entries(zIndex)) {
  lines.push(`  --z-${name}: ${value};`);
}

// ── Icon sizes ────────────────────────────────────────────────────────────
for (const [name, value] of Object.entries(iconSizes)) {
  lines.push(`  --icon-${name}: ${value}px;`);
}

lines.push("}");

// ── Light theme semantic roles (browser / no-class default) ───────────────
lines.push("");
lines.push("/* Light theme semantic roles — default (no class required). */");
lines.push(":root {");
lines.push(`  --bg-app: ${colorRolesLight.appBackground};`);
lines.push(`  --bg-panel: ${colorRolesLight.panel};`);
lines.push(`  --bg-panel-strong: ${colorRolesLight.panelStrong};`);
lines.push(`  --bg-input: ${colorRolesLight.inputBackground};`);
lines.push(`  --text-primary: ${colorRolesLight.textPrimary};`);
lines.push(`  --text-secondary: ${colorRolesLight.textSecondary};`);
lines.push(`  --text-muted: ${colorRolesLight.textMuted};`);
lines.push(`  --text-soft: ${colorRolesLight.textSoft};`);
lines.push(`  --text-placeholder: ${colorRolesLight.placeholder};`);
lines.push(`  --surface: ${colorRolesLight.surface};`);
lines.push(`  --surface-strong: ${colorRolesLight.surfaceStrong};`);
lines.push(`  --surface-subtle: ${colorRolesLight.surfaceSubtle};`);
lines.push(`  --border: ${colorRolesLight.border};`);
lines.push(`  --border-strong: ${colorRolesLight.borderStrong};`);
lines.push(`  --border-input: ${colorRolesLight.inputBorder};`);
lines.push(`  --trust-hosted-text: ${colorRolesLight.trustHostedText};`);
lines.push(`  --trust-hosted-bg: ${colorRolesLight.trustHostedBg};`);
lines.push(`  --trust-hosted-border: ${colorRolesLight.trustHostedBorder};`);
lines.push("}");

// ── Dark theme semantic roles (.dark class) ───────────────────────────────
lines.push("");
lines.push("/* Dark theme semantic roles — applied with .dark class (EmberChamber default). */");
lines.push(".dark {");
lines.push(`  --bg-app: ${colorRoles.appBackground};`);
lines.push(`  --bg-panel: ${colorRoles.panel};`);
lines.push(`  --bg-panel-strong: ${colorRoles.panelStrong};`);
lines.push(`  --bg-input: ${colorRoles.inputBackground};`);
lines.push(`  --text-primary: ${colorRoles.textPrimary};`);
lines.push(`  --text-secondary: ${colorRoles.textSecondary};`);
lines.push(`  --text-muted: ${colorRoles.textMuted};`);
lines.push(`  --text-soft: ${colorRoles.textSoft};`);
lines.push(`  --text-placeholder: ${colorRoles.placeholder};`);
lines.push(`  --surface: ${colorRoles.surface};`);
lines.push(`  --surface-strong: ${colorRoles.surfaceStrong};`);
lines.push(`  --surface-subtle: ${colorRoles.surfaceSubtle};`);
lines.push(`  --border: ${colorRoles.border};`);
lines.push(`  --border-strong: ${colorRoles.borderStrong};`);
lines.push(`  --border-input: ${colorRoles.inputBorder};`);
lines.push(`  --trust-hosted-text: ${trustState.hosted.badge};`);
lines.push(`  --trust-hosted-bg: ${trustState.hosted.badgeBg};`);
lines.push(`  --trust-hosted-border: ${trustState.hosted.border};`);
lines.push("}");

const outDir = join(__dirname, "../dist");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "tokens.css");
writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
console.log(`Generated ${outPath} (${lines.length} lines)`);
