#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f dist/index.html ]]; then
  npm run build
fi

npm run preview -- --host 127.0.0.1 --port 4173 &
WEB_PID=$!
cleanup() {
  kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

"$ROOT_DIR/node_modules/.bin/wait-on" http://127.0.0.1:4173
export NORTHSTAR_USE_DIST=1
"$ROOT_DIR/node_modules/.bin/electron" .
