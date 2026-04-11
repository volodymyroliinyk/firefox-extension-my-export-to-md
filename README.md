# ExportToMD Firefox Extension

This is a Firefox extension that allows you to easily export the current web page or a specific selected HTML element on
the page into a Markdown (`.md`) file.

## Features

* **Export Full Page:** Click the extension icon and select "Вся сторінка" from the bottom menu to save the entire page
  as Markdown.
* **Export Selected Element:** Click the extension icon to enter selection mode. Hover over elements on the page (they
  will be highlighted with a blue border). Click an element to save only that specific HTML element and its contents as
  Markdown.
* **Cancel Selection:** Click the "Скасувати вибір елемента" button to cancel the selection mode.

## Developer Instructions

### Prerequisites

* Node.js and npm installed on your system.
* Firefox browser.

### Setup and Build

1. **Install dependencies:**
   Open a terminal in the extension's root directory and run:
   ```bash
   npm install
   ```

2. **Build the extension:**
   We provide a bash script to build the extension. Run the following command:
   ```bash
   ./sh/build.sh
   ```
   This script will:
    * Compile the TypeScript files in `src/` using `esbuild`.
    * Output the compiled JavaScript to the `dist/` directory.
    * Bundle `manifest.json` and the `dist/` folder into an `addon.zip` file.

### Loading the Extension in Firefox

1. Open Firefox and navigate to `about:debugging`.
2. Click on "This Firefox" in the left sidebar.
3. Click the "Load Temporary Add-on..." button.
4. Navigate to the directory where you built the extension and select the `manifest.json` file (or the generated
   `addon.zip`).
5. The extension is now loaded temporarily. A new icon should appear on your Firefox toolbar.

### Development Process

* Source files are located in the `src/` directory.
    * `src/background.ts`: Handles background tasks and native downloads.
    * `src/content.ts`: Injected into the page to handle user interaction and selection.
    * `src/utils.ts`: Helper functions (e.g., HTML to Markdown conversion).

* Re-run `./sh/build.sh` after making changes to the source files. You may need to click "Reload" in the
  `about:debugging` page in Firefox to apply the updates.
