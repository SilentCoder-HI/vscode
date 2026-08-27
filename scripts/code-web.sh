#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f dist/index.html ]]; then
  npm run build
fi

exec npm run preview -- --host 127.0.0.1 --port 4173
