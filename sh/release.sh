#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/lib/amo-auth.sh"

amo_channel="listed"
artifacts_dir="web-ext-artifacts"
xpi_name="addon.xpi"

usage() {
  cat <<'EOF'
Usage:
  ./sh/release.sh [--channel listed|unlisted] [--skip-build]

Examples:
  ./sh/release.sh
  ./sh/release.sh --channel listed
  ./sh/release.sh --channel unlisted --skip-build

Behavior:
  - Runs the production build by default to refresh addon.zip and .release
  - Uploads the fresh production package to AMO for signing/publication
  - Does not modify git, tags, versions, changelog, or GitHub releases

Supported AMO credentials:
  AMO_JWT_ISSUER + AMO_JWT_SECRET
  or
  WEB_EXT_API_KEY + WEB_EXT_API_SECRET
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

run_build="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      amo_channel="${2:-}"
      shift 2
      ;;
    --skip-build)
      run_build="false"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$amo_channel" != "listed" && "$amo_channel" != "unlisted" ]]; then
  echo "Error: --channel must be one of: listed, unlisted" >&2
  exit 1
fi

require_cmd npm
require_cmd node

resolve_amo_credentials
print_amo_auth_source

if [[ "$run_build" == "true" ]]; then
  echo "Running fresh production build..."
  npm run build
fi

if [[ ! -f addon.zip ]]; then
  echo "Error: addon.zip not found. Run npm run build or omit --skip-build." >&2
  exit 1
fi

if [[ ! -d .release ]]; then
  echo "Error: .release not found. Run npm run build or omit --skip-build." >&2
  exit 1
fi

rm -rf "$artifacts_dir"
mkdir -p "$artifacts_dir"

echo "Uploading production package to AMO (${amo_channel})..."
./node_modules/.bin/web-ext sign \
  --source-dir ./.release \
  --artifacts-dir "$artifacts_dir" \
  --api-key "$AMO_API_KEY" \
  --api-secret "$AMO_API_SECRET" \
  --no-input \
  --channel "$amo_channel"

latest_xpi="$(ls -1t "$artifacts_dir"/*.xpi | head -n1)"
if [[ -z "$latest_xpi" ]]; then
  echo "Error: web-ext sign did not produce an .xpi artifact." >&2
  exit 1
fi

cp "$latest_xpi" "$xpi_name"

echo "AMO upload complete."
echo "Artifacts:"
echo "- addon.zip"
echo "- $xpi_name"
