# My Export to MD (Firefox Extension)

Firefox extension for exporting the current page or a selected HTML element to a Markdown (`.md`) file.

## What it does

- Exports the full current page to Markdown.
- Exports a selected element (with all nested content) to Markdown.
- Generates filenames in format: `<normalizedUrl>_<yyyymmdd_hhmmss>.md`.

## User flow

1. Click the extension icon in Firefox toolbar.
2. Hover page elements to see highlight.
3. Click an element to lock selection.
4. In the bottom panel choose:
   - `Вся сторінка` for full-page export.
   - `Вибраний елемент` for selected-element export.
5. Press `Esc` to unlock/cancel selection mode.

Important: the bottom action panel appears only after an element is selected (locked).

## Tech stack

- TypeScript
- WebExtensions API (Firefox, Manifest V2)
- `esbuild`
- `turndown`
- `web-ext`

## Project structure

- `src/background.ts` - browser action handling, content script injection, download flow.
- `src/content.ts` - selection mode UI and interaction logic.
- `src/utils.ts` - HTML to Markdown conversion helpers.
- `sh/build.sh` - production build + zip packaging.
- `sh/dev.sh` - local development run wrapper for `web-ext run`.

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
# Build JS bundles and create addon.zip
npm run build

# Run extension in Firefox for local development
npm run dev
```

## Local load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Select `manifest.json` from this project.

## Build output

- `dist/background.js`
- `dist/content.js`
- `addon.zip`

## Notes for release

- Permission model uses `activeTab` + on-demand script injection (no global `<all_urls>` content script registration).
- Run lint before publishing:

```bash
./node_modules/.bin/web-ext lint --source-dir ./ --output json
```

## Author

- Volodymyr

## License

MIT. See [LICENSE](LICENSE).
