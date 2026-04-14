# My Export to MD (Firefox Extension)

Firefox extension for exporting the current page or a selected HTML element to a Markdown (`.md`) file.

## What it does

- Exports the full current page to Markdown.
- Exports a selected element (with all nested content) to Markdown.
- Converts common HTML structures to Markdown (headings, lists, code blocks, links, images, tables).
- Supports HTML table conversion including `colspan` and `rowspan` flattening to Markdown-compatible table grids.
- Generates filenames in format: `<normalizedUrl>_<FP|SE>_<yyyymmdd_hhmmss>.md`.
- Lets the user define a remembered subfolder inside Firefox's default Downloads directory for exported `.md` files.

## User flow

1. Click the extension icon in the Firefox toolbar.
2. Hover page elements to see highlight.
3. Click an element to lock selection.
4. In the bottom panel choose:
    - Optional: set `Folder inside Firefox Downloads` to a remembered relative folder like `notes/articles`.
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
- `src/export-config.ts` - shared filename, download path, and export-directory sanitization helpers.
- `src/utils.ts` - HTML to Markdown conversion helpers (including table conversion).
- `tests/*.test.cjs` - unit tests for background/content/parser behavior.
- `sh/test.sh` - type-check + test runner wrapper.
- `sh/build.sh` - production build pipeline: sync manifest version, run lint/tests, bundle sources, validate `.release`,
  create `addon.zip`.
- `sh/build-dev.sh` - dev build with alternate add-on identity, `addon-dev.zip`, and fast-signed `addon-dev.xpi` for
  private Firefox testing.
- `sh/release.sh` - upload the fresh production package to AMO for signing/publication without touching git or GitHub.
- `sh/lib/amo-auth.sh` - shared AMO credential resolution for dev signing and release publishing.
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

# Build a DEV variant and fast-sign it for private manual testing
npm run build:dev

# Run extension in Firefox for local development
npm run dev

# Upload the fresh production package to AMO
npm run release

# Upload without rebuilding first
npm run release -- --skip-build

# Upload as an unlisted AMO build
npm run release -- --channel unlisted
```

## Local load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Select `manifest.json` from this project.

## Build output

- `dist/background.js`
- `dist/content.js`
- `.release/`
- `.release-dev/`
- `addon.zip`
- `addon.xpi`
- `addon-dev.zip`
- `addon-dev.xpi`

## Release notes

Release script (`sh/release.sh`) does the following:

1. Resolves AMO credentials from supported environment variables.
2. Runs a fresh production build by default.
3. Uploads the generated production package to AMO for signing/publication.
4. Saves the signed artifact locally as `addon.xpi`.

It does not modify git state, changelog, versions, tags, or GitHub releases.

Required AMO environment variables:

- `AMO_JWT_ISSUER`
- `AMO_JWT_SECRET`

Alternative names also supported:

- `WEB_EXT_API_KEY`
- `WEB_EXT_API_SECRET`

These variables are also required for `npm run build:dev`, because the DEV build is signed through AMO's unlisted
channel to install it as a separate temporary/private add-on.

## Security/permissions model

- Uses `activeTab` and on-demand script execution (`scripting`) instead of persistent global content script
  registration.
- Uses `storage` only to remember the user-selected export subfolder inside Firefox Downloads.
- No broad `host_permissions` are requested.

## Author

- Volodymyr

## License

MIT. See [LICENSE](LICENSE).
