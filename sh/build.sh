#!/usr/bin/env bash

set -euo pipefail

release_dir=".release"

echo "Running lint..."
if npm run lint; then
    echo "Lint passed."

    echo "Running tests..."
    if npm run test; then
        echo "Tests passed."

        echo "Building JavaScript bundles..."
        if (
            mkdir -p dist
            ./node_modules/.bin/esbuild src/content.ts --bundle --outfile=dist/content.js
            ./node_modules/.bin/esbuild src/background.ts --bundle --outfile=dist/background.js

            echo "Preparing clean release directory..."
            rm -rf "$release_dir"
            mkdir -p "$release_dir"
            cp manifest.json "$release_dir/"
            cp -r dist "$release_dir/"
            cp -r icons "$release_dir/"

            echo "Running lint on clean release directory..."
            ./node_modules/.bin/web-ext lint --source-dir "./$release_dir" --warnings-as-errors

            echo "Creating addon.zip..."
            rm -f addon.zip
            (cd "$release_dir" && zip -r ../addon.zip manifest.json dist/ icons/)
        ); then
            echo "Build complete. Lint and tests passed; addon.zip is ready."
        else
            echo "Build step failed."
            exit 1
        fi
    else
        echo "Tests failed. Build skipped."
        exit 1
    fi
else
    echo "Lint failed. Tests and build skipped."
    exit 1
fi
