#!/usr/bin/env bash

resolve_amo_credentials() {
  local issuer="${AMO_JWT_ISSUER:-${WEB_EXT_API_KEY:-}}"
  local secret="${AMO_JWT_SECRET:-${WEB_EXT_API_SECRET:-}}"

  if [[ -z "$issuer" || -z "$secret" ]]; then
    echo "Error: AMO credentials are required." >&2
    echo "Set either AMO_JWT_ISSUER + AMO_JWT_SECRET or WEB_EXT_API_KEY + WEB_EXT_API_SECRET." >&2
    return 1
  fi

  AMO_API_KEY="$issuer"
  AMO_API_SECRET="$secret"
  export AMO_API_KEY AMO_API_SECRET
}

print_amo_auth_source() {
  if [[ -n "${AMO_JWT_ISSUER:-}" && -n "${AMO_JWT_SECRET:-}" ]]; then
    echo "Using AMO credentials from AMO_JWT_ISSUER / AMO_JWT_SECRET."
    return
  fi

  if [[ -n "${WEB_EXT_API_KEY:-}" && -n "${WEB_EXT_API_SECRET:-}" ]]; then
    echo "Using AMO credentials from WEB_EXT_API_KEY / WEB_EXT_API_SECRET."
  fi
}
