#!/usr/bin/env bash

set -euo pipefail

# Best-effort cleanup for stale processes from previous web-ext dev runs.
cleanup_stale_processes() {
  local patterns=(
    "[w]eb-ext run"
    "node.*web-ext.*run"
    "firefox.*web-ext"
  )

  for pattern in "${patterns[@]}"; do
    pkill -f "$pattern" 2>/dev/null || true
  done

  # Give processes a moment to terminate gracefully.
  sleep 1

  for pattern in "${patterns[@]}"; do
    pkill -9 -f "$pattern" 2>/dev/null || true
  done
}

child_pid=""

cleanup_on_exit() {
  if [[ -n "$child_pid" ]] && kill -0 "$child_pid" 2>/dev/null; then
    # Kill the whole process group started by this script.
    kill -- -"$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
}

trap cleanup_on_exit EXIT INT TERM

cleanup_stale_processes

./node_modules/.bin/web-ext run --source-dir ./ &
child_pid=$!

wait "$child_pid"
