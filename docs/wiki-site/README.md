# EmberChamber Wiki Site

This directory contains the local build tooling for the EmberChamber wiki.

## Usage

Install dependencies:

```bash
corepack pnpm --dir docs/wiki-site install --ignore-workspace
```

Build the static site:

```bash
corepack pnpm --dir docs/wiki-site exec node build.js
```

Preview the built site locally:

```bash
cd docs/wiki-site/dist && python3 -m http.server 4173
```

Then open `http://localhost:4173`
