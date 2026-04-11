#!/bin/bash

# Exit on any error
set -e

# Create dist directory
mkdir -p dist

# Build with esbuild
./node_modules/.bin/esbuild src/content.ts --bundle --outfile=dist/content.js
./node_modules/.bin/esbuild src/background.ts --bundle --outfile=dist/background.js

# Create a zip file for Firefox
echo "Creating addon.zip..."
rm -f addon.zip
zip -r addon.zip manifest.json dist/

echo "Build complete! Load addon.zip or the directory in Firefox about:debugging"
