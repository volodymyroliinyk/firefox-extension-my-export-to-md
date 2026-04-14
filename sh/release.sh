#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/lib/amo-auth.sh"

usage() {
  cat <<'EOF'
Usage:
  ./sh/release.sh [patch|minor|major] [--channel listed|unlisted] [--no-amo] [--no-github] [--allow-dirty]

Examples:
  ./sh/release.sh patch
  ./sh/release.sh minor --channel listed
  ./sh/release.sh patch --no-github

Required environment variables for AMO upload:
  AMO_JWT_ISSUER
  AMO_JWT_SECRET

Requirements:
  - git repo with a configured origin
  - npm dependencies installed
  - gh CLI authenticated (for GitHub release)
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

ensure_github_auth() {
  if [[ "$do_github" != "true" ]]; then
    return
  fi

  require_cmd gh

  if ! gh auth status >/dev/null 2>&1; then
    echo "Error: GitHub authentication is required. Run: gh auth login" >&2
    exit 1
  fi
}

ensure_amo_auth() {
  if [[ "$do_amo" != "true" ]]; then
    return
  fi

  resolve_amo_credentials
}

ensure_release_order_policy() {
  if [[ "$do_github" == "true" && "$do_amo" != "true" ]]; then
    echo "Error: GitHub release requires AMO signing first. Remove --no-amo." >&2
    exit 1
  fi
}

run_auth_preflight() {
  ensure_release_order_policy
  ensure_github_auth
  ensure_amo_auth
}

ensure_clean_git() {
  if [[ "$allow_dirty" == "true" ]]; then
    return
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: git working tree is not clean. Commit/stash changes or use --allow-dirty." >&2
    exit 1
  fi
}

sync_manifest_version() {
  node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
manifest.version = pkg.version;
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
"
}

ensure_changelog() {
  if [[ ! -f CHANGELOG.md ]]; then
    cat > CHANGELOG.md <<'EOF'
# Changelog

All notable changes to this project will be documented in this file.
EOF
  fi
}

prepend_changelog_entry() {
  local version="$1"
  local date="$2"
  local notes_file="$3"

  local tmp_file
  tmp_file="$(mktemp)"

  {
    echo "# Changelog"
    echo
    echo "All notable changes to this project will be documented in this file."
    echo
    echo "## [${version}] - ${date}"
    cat "$notes_file"
    echo
    sed -n '/^## \[/,$p' CHANGELOG.md || true
  } > "$tmp_file"

  mv "$tmp_file" CHANGELOG.md
}

last_tag_or_empty() {
  git describe --tags --abbrev=0 2>/dev/null || true
}

generate_release_notes_from_git() {
  local previous_tag="$1"
  local notes_file="$2"

  if [[ -n "$previous_tag" ]]; then
    git log "${previous_tag}..HEAD" --pretty=format:'- %s (%h)' > "$notes_file"
  else
    git log --pretty=format:'- %s (%h)' > "$notes_file"
  fi

  if [[ ! -s "$notes_file" ]]; then
    echo "- Maintenance release." > "$notes_file"
  fi
}

extract_release_notes() {
  local version="$1"
  local notes_file="$2"

  awk -v v="$version" '
    $0 ~ "^## \\[" v "\\] - " {in_section=1; next}
    in_section && $0 ~ "^## \\[" {exit}
    in_section {print}
  ' CHANGELOG.md > "$notes_file"
}

bump_version() {
  npm version "$version_bump" --no-git-tag-version
  version="$(node -p "require('./package.json').version")"
}

release_to_amo() {
  if [[ "$do_amo" != "true" ]]; then
    echo "Skipping AMO upload (--no-amo)."
    return
  fi

  mkdir -p web-ext-artifacts
  print_amo_auth_source

  ./node_modules/.bin/web-ext sign \
    --source-dir ./.release \
    --artifacts-dir web-ext-artifacts \
    --api-key "$AMO_API_KEY" \
    --api-secret "$AMO_API_SECRET" \
    --no-input \
    --channel "$amo_channel"

  xpi_path="$(ls -1t web-ext-artifacts/*.xpi | head -n1)"
  echo "AMO signed artifact: $xpi_path"
}

release_to_github() {
  if [[ "$do_github" != "true" ]]; then
    echo "Skipping GitHub release (--no-github)."
    return
  fi

  local notes_file
  notes_file="$(mktemp)"
  extract_release_notes "$version" "$notes_file"

  if [[ -n "$xpi_path" && -f "$xpi_path" ]]; then
    gh release create "v$version" "$xpi_path" \
      --title "v$version" \
      --notes-file "$notes_file"
  else
    gh release create "v$version" \
      --title "v$version" \
      --notes-file "$notes_file"
  fi

  rm -f "$notes_file"
}

version_bump="patch"
amo_channel="listed"
do_amo="true"
do_github="true"
allow_dirty="false"
version=""
xpi_path=""
release_tag_name=""
release_tag_created="false"
publish_completed="false"

cleanup_release_tag_on_failure() {
  if [[ "$release_tag_created" != "true" || "$publish_completed" == "true" ]]; then
    return
  fi

  if [[ -n "$release_tag_name" ]] && git rev-parse -q --verify "refs/tags/$release_tag_name" >/dev/null 2>&1; then
    git tag -d "$release_tag_name" >/dev/null 2>&1 || true
    echo "Publish failed: removed local tag $release_tag_name to avoid inconsistent release state."
  fi
}

trap cleanup_release_tag_on_failure ERR

if [[ $# -gt 0 ]]; then
  case "$1" in
    patch|minor|major)
      version_bump="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
  esac
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      amo_channel="${2:-}"
      shift 2
      ;;
    --no-amo)
      do_amo="false"
      shift
      ;;
    --no-github)
      do_github="false"
      shift
      ;;
    --allow-dirty)
      allow_dirty="true"
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

require_cmd git
require_cmd npm
require_cmd node
require_cmd awk

ensure_clean_git
run_auth_preflight

echo "Bumping version ($version_bump)..."
bump_version
sync_manifest_version

release_date="$(date +%F)"
ensure_changelog
previous_tag="$(last_tag_or_empty)"
generated_notes_file="$(mktemp)"
generate_release_notes_from_git "$previous_tag" "$generated_notes_file"
prepend_changelog_entry "$version" "$release_date" "$generated_notes_file"
rm -f "$generated_notes_file"

echo "Running build pipeline..."
npm run build

echo "Committing release changes..."
git add package.json package-lock.json manifest.json CHANGELOG.md
git commit -m "release: v$version"
release_tag_name="v$version"
git tag -a "$release_tag_name" -m "Release $release_tag_name"
release_tag_created="true"

echo "Publishing to AMO..."
release_to_amo

echo "Publishing to GitHub Releases..."
release_to_github

publish_completed="true"
trap - ERR

echo "Release completed: v$version"
echo "Next step: git push origin HEAD --follow-tags"
