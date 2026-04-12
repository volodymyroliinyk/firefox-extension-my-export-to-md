# My Export to MD (Firefox Extension)

Firefox extension for exporting the current page or a selected HTML element to a Markdown (`.md`) file.

## What it does

- Exports the full current page to Markdown.
- Exports a selected element (with all nested content) to Markdown.
- Converts common HTML structures to Markdown (headings, lists, code blocks, links, images, tables).
- Supports HTML table conversion including `colspan` and `rowspan` flattening to Markdown-compatible table grids.
- Generates filenames in format: `<normalizedUrl>_<yyyymmdd_hhmmss>.md`.

## User flow

1. Click the extension icon in the Firefox toolbar.
2. Hover page elements to see highlight.
3. Click an element to lock selection.
4. In the bottom panel choose:
   - `The whole page` for full-page export.
   - `Selected item` for selected-element export.
5. Press `Esc` to unlock/cancel selection mode.

Important: the bottom action panel appears only after an element is selected (locked).

## Tech stack

- TypeScript
- WebExtensions API (Firefox, Manifest V3 with Firefox-compatible background fallback)
- `esbuild`
- `turndown`
- `web-ext`

## Project structure

- `src/background.ts` - toolbar action handling, content script start flow, markdown download handling.
- `src/content.ts` - selection mode UI and interaction logic.
- `src/utils.ts` - HTML to Markdown conversion helpers (including table conversion).
- `tests/*.test.cjs` - unit tests for background/content/parser behavior.
- `sh/test.sh` - type-check + test runner wrapper.
- `sh/build.sh` - lint + tests + build + release package lint + `addon.zip` creation.
- `sh/release.sh` - automated version bump, changelog update, build, commit/tag, AMO + GitHub publishing flow.
- `sh/lint-webext.sh` - policy wrapper around `web-ext lint` JSON output.
- `sh/smoke-firefox.sh` - optional runtime smoke test in Firefox.

## Prerequisites

- Node.js (LTS recommended)
- npm
- Firefox

## Setup

```bash
npm install
```

## Commands

```bash
# Full lint pipeline (TypeScript, tests lint, web-ext lint policy)
npm run lint

# Unit tests (includes TypeScript type-check)
npm test

# Optional real Firefox smoke test (disabled by default)
RUN_SMOKE_TEST=true npm run test:smoke

# Build bundles and create addon.zip
npm run build

# Run extension in Firefox for local development
npm run dev

# Automated release flow
npm run release -- patch
```

## Local load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Select `manifest.json` from this project.

## Build output

- `dist/background.js`
- `dist/content.js`
- `.release/`
- `addon.zip`

## Release notes

Automated release script (`sh/release.sh`) does the following:

1. Verifies auth preconditions (`gh auth`, AMO JWT env vars).
2. Bumps version and syncs `manifest.json` version.
3. Generates/updates `CHANGELOG.md` from commit history.
4. Runs full build pipeline.
5. Creates release commit + annotated tag.
6. Publishes to AMO and then GitHub Release.

Required AMO environment variables:

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

## Security/permissions model

- Uses `activeTab` and on-demand script execution (`scripting`) instead of persistent global content script
  registration.
- No broad `host_permissions` are requested.

## Author

- Volodymyr

## License

MIT. See [LICENSE](LICENSE).
