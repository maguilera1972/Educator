#!/usr/bin/env bash
# Démarre LMS-Educator depuis le répertoire du dépôt.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env" || true
  set +a
fi

export PATH="${HOME}/.local/node/bin:/usr/local/bin:$PATH"
exec node server.js
