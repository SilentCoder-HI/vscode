#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f dist/index.html ]]; then
  npm run build
fi

export NORTHSTAR_USE_DIST=1
exec "$ROOT_DIR/node_modules/.bin/electron" .
