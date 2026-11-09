#!/bin/sh
set -eu

: "${BETTER_AUTH_URL:?BETTER_AUTH_URL must be set to the public authentication URL}"

# Escape characters that have special meaning in a sed replacement.
auth_url=$(printf '%s' "$BETTER_AUTH_URL" | sed 's/[\&|]/\\&/g')
find /app/dist -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) \
  -exec sed -i "s|PUBLIC_ENV__BASE_URL|$auth_url|g" {} +

exec "$@"
